import { genPolygon } from './geojson-random.js';

export function generateRandomGeoJSON(lines,polygons,points,lineVertices,polygonVertices, minCoord, maxCoord, maxZ) {
    let r = {
        type: 'FeatureCollection',
        features: []
    };

    // create random points
    for (let i=0; i < points; i++) {
        r.features.push({ 
            type: 'Feature',
            geometry: { 
                type: 'Point', 
                coordinates: [ 
                    (Math.random() * maxCoord) + minCoord, 
                    (Math.random() * maxCoord) + minCoord, 
                    (Math.random() * maxZ)
                ]
            }, 
            properties: {} 
        })
    }

    // create random lines
    let howManyLineVertices = lineVertices;

    for (let i=0; i < lines; i++) {
        let coords = [];

        for (let j=0; j < howManyLineVertices; j++) 
            coords.push([
                (Math.random() * maxCoord) + minCoord, 
                (Math.random() * maxCoord) + minCoord, 
                (Math.random() * maxZ)
            ]);

        r.features.push({ 
            type: 'Feature',
            geometry: { 
                type: 'LineString', 
                coordinates: coords
            },
            properties: {}
        })
    }

    // create random polys
    //for (let i=0; i < polygons; i++) {
    r.features.push( ...genPolygon(polygons, polygonVertices, 10, [minCoord, minCoord, maxCoord, maxCoord], maxCoord, minCoord, maxZ).features )
    //}

    console.log(r);
    return r;
}