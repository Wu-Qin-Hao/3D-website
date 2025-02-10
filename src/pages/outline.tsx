import { useEffect } from "react";
import { Outline } from "../utils/outline";

export default function OutlinePage() {
  useEffect(() => {
    const canvas = document.getElementById("three-canvas") as HTMLCanvasElement;
    if (canvas) {
      new Outline(canvas);
    }
  }, []);

  return <canvas id="three-canvas"></canvas>;
}
