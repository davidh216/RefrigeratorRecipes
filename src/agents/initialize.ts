/**
 * Agent System Initialization
 * 
 * This module handles the initialization and registration of all agents
 * in the Sous Chef system. It should be called early in the application
 * lifecycle to ensure agents are available when needed.
 */

import { AgentRegistry } from './base';
import { SousChefAgent } from './sous-chef';

/**
 * Initialize and register all agents
 */
export function initializeAgents(): void {
  const registry = AgentRegistry.getInstance();
  
  // Register the Sous Chef Agent
  const sousChefAgent = new SousChefAgent();
  registry.register(sousChefAgent);
  
  console.log('Sous Chef Agent system initialized successfully');
}

/**
 * Get the initialized agent registry
 */
export function getAgentRegistry(): AgentRegistry {
  return AgentRegistry.getInstance();
}

/**
 * Get a specific agent by ID
 */
export function getAgent(agentId: string) {
  const registry = AgentRegistry.getInstance();
  return registry.getById(agentId);
}

/**
 * Get the primary Sous Chef Agent
 */
export function getSousChefAgent(): SousChefAgent | null {
  const registry = AgentRegistry.getInstance();
  const agent = registry.getById('sous-chef');
  return agent as SousChefAgent | null;
}