/* The four virtue statues of the Library of Celsus, drawn in code (the puzzle depends on them exactly). */
import { Ctx, TAU } from '../../engine/core';
import { dot } from '../../engine/paper';

export function drawStatue(g: Ctx, type: number, x: number, base: number, sc: number, col = '#efe2c8', shade = '#c9b48e') {
  g.save();
  g.translate(x, base);
  g.scale(sc, sc);
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(-26, 0);
  g.quadraticCurveTo(-22, -60, -16, -102);
  g.quadraticCurveTo(0, -112, 16, -102);
  g.quadraticCurveTo(22, -60, 26, 0);
  g.closePath();
  g.fill();
  dot(g, 0, -122, 10);
  g.fillRect(-4, -114, 8, 8);
  g.beginPath();
  g.moveTo(-10, -130);
  g.quadraticCurveTo(0, -140, 10, -130);
  g.quadraticCurveTo(0, -126, -10, -130);
  g.fill();
  g.strokeStyle = shade;
  g.lineWidth = 1.6;
  g.beginPath();
  for (const fx of [-10, -2, 7]) {
    g.moveTo(fx, -96);
    g.quadraticCurveTo(fx + 3, -50, fx + 1, -2);
  }
  g.stroke();
  g.strokeStyle = col;
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(-14, -100);
  g.lineTo(-18, -66);
  g.lineTo(-10, -48);
  if (type === 0) {
    // Sophia: a lamp held high
    g.moveTo(14, -100);
    g.lineTo(26, -122);
    g.lineTo(28, -142);
    g.stroke();
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(32, -146, 11, 4.5, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#ffb347';
    g.beginPath();
    g.moveTo(42, -162);
    g.quadraticCurveTo(48, -152, 42, -147);
    g.quadraticCurveTo(37, -152, 42, -162);
    g.fill();
  } else if (type === 1) {
    // Arete: a laurel wreath
    g.moveTo(14, -100);
    g.lineTo(28, -84);
    g.lineTo(38, -92);
    g.stroke();
    g.strokeStyle = '#8fae58';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(46, -98, 10, 0, TAU);
    g.stroke();
    g.fillStyle = '#8fae58';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      g.beginPath();
      g.ellipse(46 + Math.cos(a) * 10, -98 + Math.sin(a) * 10, 2, 4.5, a, 0, TAU);
      g.fill();
    }
  } else if (type === 2) {
    // Ennoia: a hand raised in thought
    g.moveTo(14, -100);
    g.lineTo(18, -74);
    g.lineTo(7, -116);
    g.stroke();
  } else {
    // Episteme: a scroll
    g.moveTo(14, -100);
    g.lineTo(20, -70);
    g.lineTo(10, -56);
    g.stroke();
    g.fillStyle = '#f3e6c4';
    g.fillRect(-16, -62, 34, 13);
    g.fillStyle = shade;
    g.fillRect(-20, -64, 6, 17);
    g.fillRect(16, -64, 6, 17);
    g.fillStyle = '#a08055';
    for (let i = 0; i < 3; i++) g.fillRect(-10, -59 + i * 4, 22, 1.3);
  }
  g.restore();
}
