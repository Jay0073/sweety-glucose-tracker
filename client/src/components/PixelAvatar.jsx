const COLORS = ['#0d6b62', '#b83f61', '#546a91', '#c98722'];

function hashText(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function PixelAvatar({ value, size = 40 }) {
  const hash = hashText(value.toLowerCase());
  const color = COLORS[hash % COLORS.length];
  const cells = [];

  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const bit = (hash >> ((row * 3 + column) % 24)) & 1;
      if (!bit) continue;
      cells.push([column, row]);
      if (column !== 2) cells.push([4 - column, row]);
    }
  }

  return (
    <svg aria-hidden="true" className="pixel-avatar" height={size} viewBox="0 0 5 5" width={size} shapeRendering="crispEdges">
      <rect width="5" height="5" fill="#d9eeea" />
      {cells.map(([x, y]) => <rect fill={color} height="1" key={`${x}-${y}`} width="1" x={x} y={y} />)}
    </svg>
  );
}
