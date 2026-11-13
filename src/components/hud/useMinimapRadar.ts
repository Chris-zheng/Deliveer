import { useEffect } from 'react';
import type React from 'react';
import { HazardKind, SignalAxisState, TILE_SIZE, TileType } from '../../game/types';
import type { MinimapSnapshot } from './types';

/** 10 Hz heading-up 2D canvas GPS radar, isolated from the HUD render body. */
export function useMinimapRadar(
  mapCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  minimapRef: React.RefObject<MinimapSnapshot>,
): void {
  useEffect(() => {
    let pulseTick = 0;
    const drawMap = () => {
      const cvs = mapCanvasRef.current;
      const snap = minimapRef.current;
      if (!cvs || !snap || !snap.city) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      pulseTick += 1;
      const city = snap.city;
      const N = city.totalGridSize;
      const size = cvs.width;
      const cell = 5.2;

      const worldToMap = (wx: number, wz: number) => {
        const half = (N - 1) * 0.5;
        const gc = wx / TILE_SIZE + half;
        const gr = wz / TILE_SIZE + half;
        return {
          mx: (gc + 0.5) * cell,
          my: (gr + 0.5) * cell,
        };
      };

      const vanPt = worldToMap(snap.truckX, snap.truckZ);
      const vanScreenX = size * 0.5;
      const vanScreenY = size * 0.62;

      ctx.fillStyle = '#4bb7ef';
      ctx.fillRect(0, 0, size, size);

      ctx.save();
      ctx.translate(vanScreenX, vanScreenY);
      ctx.rotate(snap.truckYaw + Math.PI);
      ctx.translate(-vanPt.mx, -vanPt.my);

      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const t = city.tiles[r][c];
          if (t === TileType.Water) continue;
          if (t === TileType.InnerRoad || t === TileType.OuterRoad) {
            ctx.fillStyle = '#f8f5ec';
          } else if (t === TileType.Bridge) {
            ctx.fillStyle = '#e7b171';
          } else if (t === TileType.Building) {
            ctx.fillStyle = '#8ec96b';
          } else {
            ctx.fillStyle = '#a7e074';
          }
          ctx.fillRect(
            c * cell,
            r * cell,
            Math.ceil(cell) + 0.4,
            Math.ceil(cell) + 0.4,
          );
        }
      }

      for (const sig of city.trafficSignals) {
        const { mx, my } = worldToMap(sig.x, sig.z);
        const ewGo =
          sig.state === SignalAxisState.EWGreen ||
          sig.state === SignalAxisState.EWYellow;
        ctx.fillStyle = ewGo ? '#10b981' : '#ef4444';
        ctx.fillRect(mx - 2.1, my - 2.1, 4.2, 4.2);
      }

      for (const kiosk of city.coffeeKiosks) {
        if (kiosk.cooldown > 0) continue;
        const { mx, my } = worldToMap(kiosk.roadX, kiosk.roadZ);
        ctx.fillStyle = '#2dd4bf';
        ctx.strokeStyle = '#1d1205';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(mx, my, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      for (const gar of city.mechanicGarages) {
        if (gar.cooldown > 0) continue;
        const { mx, my } = worldToMap(gar.roadX, gar.roadZ);
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#1d1205';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (
        city.rivalCourier &&
        !city.rivalCourier.bonusClaimed &&
        !city.rivalCourier.rivalWonBonus
      ) {
        const bp = worldToMap(
          city.rivalCourier.bonusDropPos.x,
          city.rivalCourier.bonusDropPos.z,
        );
        ctx.fillStyle = '#ffee1f';
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(bp.mx, bp.my, 3.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const rv = worldToMap(city.rivalCourier.x, city.rivalCourier.z);
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(rv.mx, rv.my, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const h of city.hazards) {
        const { mx, my } = worldToMap(h.x, h.z);
        ctx.fillStyle =
          h.kind === HazardKind.BridgeGate ? '#f59e0b' : '#ef4444';
        ctx.beginPath();
        ctx.arc(mx, my, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const stop of city.stops) {
        const mx = (stop.roadCoord.col + 0.5) * cell;
        const my = (stop.roadCoord.row + 0.5) * cell;
        if (stop.delivered) {
          ctx.fillStyle = '#26c42f';
          ctx.beginPath();
          ctx.arc(mx, my, 2.8, 0, Math.PI * 2);
          ctx.fill();
        } else if (stop.index === snap.activeStopIndex) {
          const ringR = 5.4 + Math.sin(pulseTick * 0.55) * 1.8;
          ctx.strokeStyle = '#ffdf24';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(mx, my, ringR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ff9914';
          ctx.strokeStyle = '#1d1205';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(mx, my, 3.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = '#fffbeb';
          ctx.strokeStyle = '#1d1205';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(mx, my, 2.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Real Street Name Badges on GPS Minimap (counter-rotated so text always reads upright!)
      if (city.streetSigns && city.streetSigns.length > 0) {
        const invRot = -(snap.truckYaw + Math.PI);
        const drawnPts: { mx: number; my: number }[] = [];
        for (let si = 0; si < city.streetSigns.length && drawnPts.length < 5; si++) {
          const sign = city.streetSigns[si];
          const { mx, my } = worldToMap(sign.x, sign.z);
          if (drawnPts.some((p) => Math.hypot(p.mx - mx, p.my - my) < 20)) {
            continue;
          }
          drawnPts.push({ mx, my });
          ctx.save();
          ctx.translate(mx, my);
          ctx.rotate(invRot);
          const label = sign.streetName.length > 6 ? sign.streetName.slice(0, 6) : sign.streetName;
          ctx.font = 'bold 6.5px "Plus Jakarta Sans", sans-serif';
          const tw = Math.max(20, ctx.measureText(label).width + 5);
          ctx.fillStyle = 'rgba(22, 93, 255, 0.9)';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.roundRect(-tw / 2, -4.5, tw, 9, 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, 0, 0.3);
          ctx.restore();
        }
      }

      ctx.restore();

      // Heading-Up Courier Van Chevron
      ctx.save();
      ctx.translate(vanScreenX, vanScreenY);
      ctx.fillStyle = '#ffdf24';
      ctx.strokeStyle = '#1d1205';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -5.8);
      ctx.lineTo(-4.2, 4.2);
      ctx.lineTo(0, 2.0);
      ctx.lineTo(4.2, 4.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    drawMap();
    const id = window.setInterval(drawMap, 100);
    return () => window.clearInterval(id);
  }, [mapCanvasRef, minimapRef]);
}
