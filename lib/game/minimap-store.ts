import type {WorldManifest,WorldWalker} from './world-walker';
/** Presentation only: the world map layer shares its walker so the minimap can draw the same positions. */
export type MinimapSource={zone:string;map:WorldManifest;walker:WorldWalker;base:string};
export const worldMinimap:{current:MinimapSource|null}={current:null};
