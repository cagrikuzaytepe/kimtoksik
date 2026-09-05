function scale(s: number, v: number) {
  return Math.round(v * s);
}

export function BrandMark({ scale: s = 1 }: { scale?: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        background: "#161616",
        borderRadius: scale(16, s),
        border: `${scale(3, s)}px solid rgba(239, 68, 68, 0.45)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: scale(20, s),
          height: scale(20, s),
          borderRadius: "50%",
          background: "#ef4444",
          left: scale(9, s),
          top: scale(15, s),
        }}
      />
      <div
        style={{
          position: "absolute",
          width: scale(20, s),
          height: scale(20, s),
          borderRadius: "50%",
          background: "#ef4444",
          left: scale(35, s),
          top: scale(15, s),
        }}
      />
      <div
        style={{
          position: "absolute",
          width: scale(20, s),
          height: scale(20, s),
          background: "#ef4444",
          left: scale(22, s),
          top: scale(27, s),
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: scale(4, s),
          height: scale(46, s),
          background: "#f5f5f5",
          left: scale(32, s),
          top: scale(9, s),
          transform: "rotate(-32deg)",
          borderRadius: scale(2, s),
        }}
      />
    </div>
  );
}