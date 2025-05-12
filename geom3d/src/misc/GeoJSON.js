import {Point} from '../geometry/Point';
import {Line} from '../geometry/Line';
import {Polygon} from '../geometry/Polygon';

class GeoJSON {
    static import(geojson) {
        let geometries = [];

        for (let feature of geojson.features) {
            if (feature.geometry.type == 'Point') geometries.push(new Point(feature.geometry.coordinates, { properties: feature.properties }));
            else if (feature.geometry.type == 'LineString') geometries.push(new Line(feature.geometry.coordinates, { properties: feature.properties }));
            else if (feature.geometry.type == 'Polygon') geometries.push(new Polygon(feature.geometry.coordinates, { properties: feature.properties }));
        }

        return geometries;
    }

    static export(geometryLayer) {
           let featureCollection = {
            type: "FeatureCollection",
            features: []
        };

        for (let geometry of geometryLayer.geometries) {
            let geomType = null;

            if (geometry.type == 'Line') geomType = 'LineString';
            else if (geometry.type == 'Polygon') geomType = 'Polygon';
            else if (geometry.type == 'Point') geomType = 'Point';

            featureCollection.features.push({
                type: 'Feature',
                properties: geometry.properties,
                geometry: {
                    coordinates: geometry.type != 'Polygon' ? geometry.vectors : [ geometry.vectors, ...geometry.holes ],
                    type: geomType
                }
            });
        }

        return featureCollection;
    }

    static download(geojson, filename = 'download') {      
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geojson));
        let dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `${filename}.geojson`);
        dlAnchorElem.click();
    }
}

export { GeoJSON }