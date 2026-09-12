/** Static engineering grid. No drifting blobs, no travelling scanline —
 *  a background should not compete with the instruments in front of it. */
export function Backdrop() {
  return <div className="mesh" aria-hidden />;
}
