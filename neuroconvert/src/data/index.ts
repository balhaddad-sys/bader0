import type { Module } from '../types';
import { antiseizure } from './modules/antiseizure';
import { benzodiazepines } from './modules/benzodiazepines';
import { botulinum } from './modules/botulinum';
import { corticosteroids } from './modules/corticosteroids';
import { dementia } from './modules/dementia';
import { parkinson } from './modules/parkinson';

export const DATA_VERSION = '2026-11-16';
export const APP_VERSION = '1.0.0';

export const MODULES: Module[] = [antiseizure, benzodiazepines, parkinson, corticosteroids, botulinum, dementia];

export const MODULE_MAP: ReadonlyMap<string, Module> = new Map(MODULES.map((m) => [m.id, m]));

export { REFERENCES, REFERENCE_MAP, getReference } from './references';
