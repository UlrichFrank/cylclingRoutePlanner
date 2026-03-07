const gpxParser = require('gpxparser');
const xml = `<gpx><trk><trkseg><trkpt lat="52.0" lon="13.0"><ele>100</ele></trkpt><trkpt lat="52.1" lon="13.1"><ele>150</ele></trkpt></trkseg></trk></gpx>`;
const g = new gpxParser();
g.parse(xml);
console.log(g.tracks[0].distance.total);
