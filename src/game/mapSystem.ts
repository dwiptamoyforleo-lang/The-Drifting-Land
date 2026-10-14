export interface MapLocation {
    id: string;
      name: string;
        x: number;
          z: number;
            type: 'settlement' | 'checkpoint' | 'portal' | 'quest' | 'discovery';
              discovered: boolean;
              }

              export class MapSystem {
                public locations: MapLocation[] = [
                    { id: 'loc-1', name: 'Observation Deck', x: 0, z: 0, type: 'settlement', discovered: true },
                        { id: 'loc-2', name: 'Abandoned Beacon', x: 45, z: -30, type: 'quest', discovered: true },
                            { id: 'loc-3', name: 'Ancient Tower', x: -80, z: 120, type: 'discovery', discovered: false },
                                { id: 'loc-4', name: 'Dimensional Portal', x: 150, z: 200, type: 'portal', discovered: false },
                                  ];

                                    public discoverLocation(id: string) {
                                        const loc = this.locations.find(l => l.id === id);
                                            if (loc && !loc.discovered) {
                                                  loc.discovered = true;
                                                      }
                                                        }
                                                        }
                                                        
}