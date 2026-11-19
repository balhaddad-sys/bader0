import type { Module } from '../types';
import { antiseizure } from './modules/antiseizure';
import { benzodiazepines } from './modules/benzodiazepines';
import { botulinum } from './modules/botulinum';
import { corticosteroids } from './modules/corticosteroids';
import { dementia } from './modules/dementia';
import { gabapentinoids } from './modules/gabapentinoids';
import { immunoglobulin } from './modules/immunoglobulin';
import { levels } from './modules/levels';
import { parkinson } from './modules/parkinson';

export const DATA_VERSION = '2026-11-19';
export const APP_VERSION = '1.1.0';

export const MODULES: Module[] = [
  antiseizure,
  levels,
  benzodiazepines,
  parkinson,
  corticosteroids,
  botulinum,
  dementia,
  gabapentinoids,
  immunoglobulin,
];

export const MODULE_MAP: ReadonlyMap<string, Module> = new Map(MODULES.map((m) => [m.id, m]));

export { REFERENCES, REFERENCE_MAP, getReference } from './references';
export { FINDINGS, OMISSIONS } from './findings';
