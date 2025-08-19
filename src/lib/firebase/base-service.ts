import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreError,
  QueryConstraint,
  CollectionReference
} from 'firebase/firestore';
import { db } from './config';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEntityData {
  [key: string]: any;
}

export interface UpdateEntityData {
  [key: string]: any;
}

export class FirebaseServiceError extends Error {
  constructor(
    message: string,
    public originalError: any,
    public operation: string,
    public entityType: string
  ) {
    super(message);
    this.name = 'FirebaseServiceError';
  }
}

export abstract class BaseFirebaseService<T extends BaseEntity, CreateData extends CreateEntityData, UpdateData extends UpdateEntityData> {
  protected abstract collectionName: string;
  protected abstract docToEntity(doc: QueryDocumentSnapshot<DocumentData>): T;
  protected abstract entityToDoc(data: CreateData): DocumentData;

  protected getCollectionRef(userId: string): CollectionReference {
    return collection(db, 'users', userId, this.collectionName);
  }

  protected getDocRef(userId: string, entityId: string) {
    return doc(db, 'users', userId, this.collectionName, entityId);
  }

  protected handleError(error: any, operation: string): never {
    const serviceError = new FirebaseServiceError(
      `Error ${operation} ${this.collectionName}: ${error.message}`,
      error,
      operation,
      this.collectionName
    );
    console.error(serviceError.message, error);
    throw serviceError;
  }

  async create(userId: string, data: CreateData): Promise<string> {
    try {
      const docData = {
        ...this.entityToDoc(data),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(this.getCollectionRef(userId), docData);
      return docRef.id;
    } catch (error) {
      this.handleError(error, 'creating');
    }
  }

  async getById(userId: string, entityId: string): Promise<T | null> {
    try {
      const docSnap = await getDoc(this.getDocRef(userId, entityId));
      
      if (docSnap.exists()) {
        return this.docToEntity(docSnap as QueryDocumentSnapshot<DocumentData>);
      }
      return null;
    } catch (error) {
      this.handleError(error, 'getting');
    }
  }

  async getAll(userId: string, constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const q = query(
        this.getCollectionRef(userId),
        orderBy('createdAt', 'desc'),
        ...constraints
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.docToEntity(doc));
    } catch (error) {
      this.handleError(error, 'getting all');
    }
  }

  async update(userId: string, entityId: string, updates: UpdateData): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(this.getDocRef(userId, entityId), updateData);
    } catch (error) {
      this.handleError(error, 'updating');
    }
  }

  async delete(userId: string, entityId: string): Promise<void> {
    try {
      await deleteDoc(this.getDocRef(userId, entityId));
    } catch (error) {
      this.handleError(error, 'deleting');
    }
  }

  subscribeToChanges(
    userId: string,
    callback: (entities: T[]) => void,
    onError?: (error: FirestoreError) => void,
    constraints: QueryConstraint[] = []
  ) {
    const q = query(
      this.getCollectionRef(userId),
      orderBy('createdAt', 'desc'),
      ...constraints
    );
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const entities = querySnapshot.docs.map(doc => this.docToEntity(doc));
        callback(entities);
      },
      (error) => {
        console.error(`Error in ${this.collectionName} subscription:`, error);
        if (onError) onError(error);
      }
    );
  }
}
