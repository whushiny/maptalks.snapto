import * as maptalks from 'maptalks';
import rbush from 'geojson-rbush';

const options = {
    'mode': 'point',
    'tolerance':10
};


export class SnapTool extends maptalks.MapTool {
    constructor(options) {
        super(options);
        //this._checkMode();
    }

    getMode() {
        return this.mode;
    }

    setMode(mode) {
        this.mode = mode;
    }

    addTo(map) {
        this._mousemoveLayer = new maptalks.VectorLayer('SnapTool_mousemovelayer').addTo(map);
        return super.addTo(map);
    }

    enable() {
        const map = this.getMap();
        this.allGeometries = this._getAllGeometries();
        if (this.allGeometries) {
            this._registerEvents(map);
        }
    }

    disable() {
        const map = this.getMap();
        map.off('mousemove', this._mousemove);
    }

    setLayer(layer) {
        if (layer instanceof maptalks.VectorLayer) {
            this._snapLayer = layer;
        }
    }

    _prepareGeometries(coordinate) {
        if (this.allGeometries) {
            const allGeoInGeojson = this._toGeoJSON(this.allGeometries);
            let tree = rbush();
            tree.load({
                'type': 'FeatureCollection',
                'features':allGeoInGeojson
            });
            const inspectExtent = this._createInspectExtent(coordinate);
            const availGeometries = tree.search(inspectExtent);
            return availGeometries;
        }
        return null;
    }

    _createInspectExtent(coordinate) {
        const tolerance = (!this.options['tolerance']) ? 10 : this.options['tolerance'];
        const map = this.getMap();
        const zoom = map.getZoom();
        const screenPoint = map.coordinateToPoint(coordinate, zoom);
        const lefttop = map.pointToCoordinate(new maptalks.Point([screenPoint.x - tolerance, screenPoint.y - tolerance]), zoom);
        const righttop = map.pointToCoordinate(new maptalks.Point([screenPoint.x + tolerance, screenPoint.y - tolerance]), zoom);
        const leftbottom = map.pointToCoordinate(new maptalks.Point([screenPoint.x - tolerance, screenPoint.y + tolerance]), zoom);
        const rightbottom = map.pointToCoordinate(new maptalks.Point([screenPoint.x + tolerance, screenPoint.y + tolerance]), zoom);
        return {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'Polygon',
                'coordinates': [[[lefttop.x, lefttop.y], [righttop.x, righttop.y], [rightbottom.x, rightbottom.y], [leftbottom.x, leftbottom.y]]]
            }
        };
    }
    _registerEvents(map) {
        this._mousemove = function (e) {
            if (!this._marker) {
                this._marker = new maptalks.Marker(e.coordinate, {
                    'symbol' : {
                        'markerType': 'ellipse',
                        'markerFill': 'rgb(10,20,200)',
                        'markerFillOpacity': 1,
                        'markerLineColor': '#fff',
                        'markerLineWidth': 1,
                        'markerLineOpacity': 1,
                        'markerWidth': 20,
                        'markerHeight': 20,
                        'markerDx': 0,
                        'markerDy': 0
                    }
                }).addTo(this._mousemoveLayer);
            } else {
                this._marker.setCoordinates(e.coordinate);
            }
            var geos = this._findGeometry(e.coordinate);
            if (geos.features.length > 0) {
                console.log(geos.features.length);
            }
            return geos;
        };
        map.on('mousemove', this._mousemove, this);
    }

    _findGeometry(coordinate) {
        const tolerance = (!this.options['tolerance']) ? 10 : this.options['tolerance'];
        const availGeimetries = this._prepareGeometries(coordinate, tolerance);
        return availGeimetries;
    }

    _snap() {
        const mousePoint = this._marker.toGeoJSON();
        return mousePoint;
    }

    _getAllGeometries() {
        let _allGeometries = [];
        if (this._snapLayer) {
            _allGeometries = this._snapLayer.getGeometries();
        } else {
            const map = this.getMap();
            const layers = map.getLayers(function (layer) {
                return (layer instanceof maptalks.VectorLayer);
            });
            layers.forEach(function (layer) {
                _allGeometries = _allGeometries.concat(layer.getGeometries());
            });
        }
        return _allGeometries;
    }
    ///
    _toGeoJSON(geometries) {
        const _snapGeometries = [];
        if (geometries instanceof Array) {
            geometries.forEach(function (geo) {
                const geojson = geo.toGeoJSON();
                geojson.obj = geo;
                _snapGeometries.push(geojson);
            });
        }
        return _snapGeometries;
    }
    //calaculate the distance from a point to a line
    _distToPolyline(point, line) {
        const equation = this._setEquation(line);
        const A = equation.A;
        const B = equation.B;
        const C = equation.C;
        const distance = Math.abs((A * point.x + B * point.y + C) / Math.sqrt(Math.pow(A, 2) + Math.pow(B, 2)));
        return distance;
    }
    //create a line's equation
    _setEquation(line) {
        const coords = line.getCoordinates();
        const from = coords[0];
        const to = coords[1];
        const k = (from.y - to.y) / (from.x - to.x);
        const A = k;
        const B = -1;
        const C = from.y - k * from.x;
        return {
            A : A,
            B : B,
            C : C
        };
    }

    _solveEquation(equationW, equationU) {
        const A1 = equationW.A,B1 = equationW.B, C1 = equationW.C;
        const A2 = equationU.A,B1 = equationU.B, C1 = equationU.C;
        //const x = ()
    }

}

SnapTool.mergeOptions(options);

