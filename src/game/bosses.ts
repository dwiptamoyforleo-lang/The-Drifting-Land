/**
 *  * BOSSES, MINI-BOSSES, AND SPECIAL ENCOUNTERS
  * Implements regional bosses with environmental ties, telegraphs, and progression tracking[span_7](start_span)[span_7](end_span).
   */

   import * as THREE from 'three';

   export interface BossConfig {
     id: string;
       name: string;
         region: string;
           health: number;
             description: string;
             }

             export const REGIONAL_BOSSES: BossConfig[] = [
               {
                   id: 'rootbound_guardian',
                       name: 'The Rootbound Guardian',
                           region: 'The Living Reach (Ancient Forest)',
                               health: 1800,
                                   description: 'Ancient botanical sentinel rooted in the deep canopy platform.',
                                     },
                                       {
                                           id: 'ash_colossus',
                                               name: 'The Ash Colossus',
                                                   region: 'The Ashen Expanse (Volcanic Ruins)',
                                                       health: 3000,
                                                           description: 'Magma-forged titan guarding geothermal thermal vents.',
                                                             },
                                                               {
                                                                   id: 'storm_sentinel',
                                                                       name: 'The Storm Sentinel',
                                                                           region: 'The Moonveil (High-Altitude Structure)',
                                                                               health: 2200,
                                                                                   description: 'Lightning-harnessing automaton protecting celestial meteorological arrays.',
                                                                                     },
                                                                                       {
                                                                                           id: 'archive_keeper',
                                                                                               name: 'The Archive Keeper',
                                                                                                   region: 'The Fractured Archive',
                                                                                                       health: 2500,
                                                                                                           description: 'Cryptographic overseer defending ancient knowledge repositories.',
                                                                                                             },
                                                                                                               {
                                                                                                                   id: 'rift_sovereign',
                                                                                                                       name: 'The Rift Sovereign',
                                                                                                                           region: 'The Rift (Great Drift Origin)',
                                                                                                                               health: 4500,
                                                                                                                                   description: 'Late-game dimensional entity manipulating gravity and spacetime geometry.',
                                                                                                                                     },
                                                                                                                                       {
                                                                                                                                           id: 'crimson_warden',
                                                                                                                                               name: 'The Crimson Warden',
                                                                                                                                                   region: 'The Moonveil (Red Moon Eclipse)',
                                                                                                                                                       health: 2500,
                                                                                                                                                           description: 'Ethereal enforcer unlocked exclusively during the rare Red Moon alignment.',
                                                                                                                                                             },
                                                                                                                                                             ];
                                                                                                                                                             
 */