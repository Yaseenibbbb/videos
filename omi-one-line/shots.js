// Camera keyframes: t seconds, (x, y) composition centre (world units), z = pixels per unit, r roll (degrees), f follow weight (0 = composed, 1 = on the nib).
// Scenes are framed with their floor near screen y ≈ 1240 so the written words sit below the drawing on bare paper.
const fl = (floor, z, at = 1240) => floor - (at - 960) / z;
export const CAM = [
  { t: 0.0, x: 5480, y: 120, z: 0.62, r: 0, f: 0.85 },        // mid-line at speed: the nib already ruling the month
  { t: 1.4, x: 4300, y: 1800, z: 0.34, r: 0, f: 0.6 },
  { t: 3.6, x: 2800, y: 4150, z: 0.183, r: 0, f: 0 },         // the whole month, high in the frame (the words sit under it)
  { t: 6.2, x: 2860, y: 4110, z: 0.183, r: 0, f: 0 },
  { t: 7.6, x: 3800, y: 2750, z: 0.3, r: 0, f: 0.1 },         // "this one"
  { t: 9.3, x: 4400, y: 1975, z: 1.0, r: 0, f: 0 },           // signature: one continuous push into the day
  { t: 10.3, x: 4420, y: fl(2180, 1.5), z: 1.5, r: 0, f: 0.1 },
  { t: 12.8, x: 4580, y: fl(2180, 2.0), z: 2.0, r: 0, f: 0.25 },   // the children
  { t: 14.6, x: 4360, y: fl(2180, 2.0), z: 2.0, r: 0, f: 0.2 },    // Mum calls
  { t: 16.6, x: 4220, y: fl(2180, 1.85), z: 1.85, r: 0, f: 0.15 },  // the table
  { t: 18.0, x: 4440, y: fl(2180, 1.45), z: 1.45, r: 0, f: 0 },     // the late one, the whole room
  { t: 20.7, x: 4420, y: fl(2180, 1.42), z: 1.42, r: 0, f: 0 },
  { t: 21.6, x: 3600, y: 3300, z: 0.45, r: -2, f: 0.9 },      // the years: along the calendar lines
  { t: 22.7, x: 2300, y: fl(4780, 1.8), z: 1.8, r: 0, f: 0.4 },
  { t: 25.6, x: 2260, y: 4420, z: 1.8, r: 0, f: 0.3 },         // crane up the growth marks
  { t: 26.8, x: 1960, y: fl(4780, 1.55), z: 1.55, r: 0, f: 0.15 },  // grown-ups round the table
  { t: 29.0, x: 1960, y: 4500, z: 1.4, r: 0, f: 0.2 },
  { t: 31.3, x: 1820, y: 4230, z: 1.7, r: 0, f: 0.35 },        // the laugh rises
  { t: 33.2, x: 1790, y: 4180, z: 2.1, r: 0, f: 0.3 },         // the stop: slow push-in on the blot
  { t: 35.0, x: 1300, y: fl(4780, 1.5), z: 1.5, r: 0, f: 0.45 },   // down as steam into her glass
  { t: 37.0, x: 1220, y: fl(4780, 1.45), z: 1.45, r: 0, f: 0.15 },  // today, composed (mirrored seats)
  { t: 44.6, x: 1180, y: fl(4780, 1.42), z: 1.42, r: 0, f: 0.1 },
  { t: 47.0, x: 1110, y: 4440, z: 1.75, r: 0, f: 0.2 },        // her words become the old lunch
  { t: 49.4, x: 1130, y: 4460, z: 1.6, r: 0, f: 0.15 },
  { t: 51.4, x: 1200, y: 6730, z: 0.62, r: 0, f: 0.15 },       // out of the calendar: the book
  { t: 52.6, x: 1200, y: 6730, z: 0.62, r: 0, f: 0 },
  { t: 56.0, x: 1200, y: 6720, z: 0.625, r: 0, f: 0 },
];
