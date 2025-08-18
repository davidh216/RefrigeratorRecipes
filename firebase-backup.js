const { exec } = require('child_process');
const { Storage } = require('@google-cloud/storage');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const db = admin.firestore();
const storage = new Storage();

class FirebaseBackup {
  constructor() {
    this.bucketName = process.env.BACKUP_BUCKET_NAME || 'refrigerator-recipes-backups';
    this.bucket = storage.bucket(this.bucketName);
  }

  // Create a timestamp for the backup
  getBackupTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  // Backup all Firestore collections
  async backupAllCollections() {
    const timestamp = this.getBackupTimestamp();
    console.log(`Starting Firestore backup at ${timestamp}`);

    try {
      // Get all collections
      const collections = await db.listCollections();
      const backupData = {};

      for (const collection of collections) {
        const collectionName = collection.id;
        console.log(`Backing up collection: ${collectionName}`);
        
        const snapshot = await db.collection(collectionName).get();
        const documents = [];
        
        snapshot.forEach(doc => {
          documents.push({
            id: doc.id,
            data: doc.data(),
            createTime: doc.createTime?.toDate?.()?.toISOString(),
            updateTime: doc.updateTime?.toDate?.()?.toISOString()
          });
        });

        backupData[collectionName] = {
          count: documents.length,
          documents: documents,
          backedUpAt: timestamp
        };
      }

      // Upload to Google Cloud Storage
      const fileName = `firestore-backup-${timestamp}.json`;
      const file = this.bucket.file(fileName);
      
      await file.save(JSON.stringify(backupData, null, 2), {
        metadata: {
          contentType: 'application/json',
          metadata: {
            backupType: 'firestore',
            timestamp: timestamp,
            collections: Object.keys(backupData),
            totalDocuments: Object.values(backupData).reduce((sum, collection) => sum + collection.count, 0)
          }
        }
      });

      console.log(`Backup completed successfully: ${fileName}`);
      
      // Clean up old backups (keep last 30 days)
      await this.cleanupOldBackups();
      
      return fileName;
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }

  // Backup specific collection
  async backupCollection(collectionName) {
    const timestamp = this.getBackupTimestamp();
    console.log(`Starting backup of collection: ${collectionName}`);

    try {
      const snapshot = await db.collection(collectionName).get();
      const documents = [];
      
      snapshot.forEach(doc => {
        documents.push({
          id: doc.id,
          data: doc.data(),
          createTime: doc.createTime?.toDate?.()?.toISOString(),
          updateTime: doc.updateTime?.toDate?.()?.toISOString()
        });
      });

      const backupData = {
        collection: collectionName,
        count: documents.length,
        documents: documents,
        backedUpAt: timestamp
      };

      const fileName = `collection-backup-${collectionName}-${timestamp}.json`;
      const file = this.bucket.file(fileName);
      
      await file.save(JSON.stringify(backupData, null, 2), {
        metadata: {
          contentType: 'application/json',
          metadata: {
            backupType: 'collection',
            collection: collectionName,
            timestamp: timestamp,
            documentCount: documents.length
          }
        }
      });

      console.log(`Collection backup completed: ${fileName}`);
      return fileName;
    } catch (error) {
      console.error(`Collection backup failed for ${collectionName}:`, error);
      throw error;
    }
  }

  // Restore from backup
  async restoreFromBackup(backupFileName) {
    console.log(`Starting restore from backup: ${backupFileName}`);

    try {
      const file = this.bucket.file(backupFileName);
      const [content] = await file.download();
      const backupData = JSON.parse(content.toString());

      if (backupData.collection) {
        // Single collection restore
        await this.restoreCollection(backupData);
      } else {
        // Full restore
        for (const [collectionName, collectionData] of Object.entries(backupData)) {
          if (collectionName !== 'backedUpAt') {
            await this.restoreCollection({
              collection: collectionName,
              documents: collectionData.documents
            });
          }
        }
      }

      console.log('Restore completed successfully');
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }

  // Restore specific collection
  async restoreCollection(collectionData) {
    const { collection, documents } = collectionData;
    console.log(`Restoring collection: ${collection} with ${documents.length} documents`);

    const batch = db.batch();
    let batchCount = 0;
    const maxBatchSize = 500;

    for (const doc of documents) {
      const docRef = db.collection(collection).doc(doc.id);
      batch.set(docRef, doc.data);
      batchCount++;

      if (batchCount >= maxBatchSize) {
        await batch.commit();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`Collection ${collection} restored successfully`);
  }

  // Clean up old backups (keep last 30 days)
  async cleanupOldBackups() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const [files] = await this.bucket.getFiles();
      
      for (const file of files) {
        const [metadata] = await file.getMetadata();
        const createdAt = new Date(metadata.timeCreated);
        
        if (createdAt < thirtyDaysAgo) {
          await file.delete();
          console.log(`Deleted old backup: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // List available backups
  async listBackups() {
    try {
      const [files] = await this.bucket.getFiles();
      const backups = [];

      for (const file of files) {
        const [metadata] = await file.getMetadata();
        backups.push({
          name: file.name,
          size: metadata.size,
          created: metadata.timeCreated,
          updated: metadata.updated
        });
      }

      return backups.sort((a, b) => new Date(b.created) - new Date(a.created));
    } catch (error) {
      console.error('Failed to list backups:', error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const backup = new FirebaseBackup();
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'backup-all':
      backup.backupAllCollections()
        .then(fileName => console.log(`Backup saved as: ${fileName}`))
        .catch(console.error);
      break;
    
    case 'backup-collection':
      if (!arg) {
        console.error('Please specify collection name');
        process.exit(1);
      }
      backup.backupCollection(arg)
        .then(fileName => console.log(`Backup saved as: ${fileName}`))
        .catch(console.error);
      break;
    
    case 'restore':
      if (!arg) {
        console.error('Please specify backup file name');
        process.exit(1);
      }
      backup.restoreFromBackup(arg)
        .then(() => console.log('Restore completed'))
        .catch(console.error);
      break;
    
    case 'list':
      backup.listBackups()
        .then(backups => {
          console.log('Available backups:');
          backups.forEach(backup => {
            console.log(`- ${backup.name} (${new Date(backup.created).toLocaleString()})`);
          });
        })
        .catch(console.error);
      break;
    
    default:
      console.log(`
Usage: node firebase-backup.js <command> [argument]

Commands:
  backup-all                    Backup all Firestore collections
  backup-collection <name>      Backup specific collection
  restore <filename>           Restore from backup file
  list                         List available backups
      `);
  }
}

module.exports = FirebaseBackup;
