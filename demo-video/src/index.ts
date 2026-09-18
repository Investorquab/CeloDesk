import React from "react";
import { Composition, registerRoot } from "remotion";
import { CeloDeskVideo } from "./CeloDeskVideo";

const RemotionRoot: React.FC = () => (
  <Composition
    id="CeloDeskDemo"
    component={CeloDeskVideo}
    durationInFrames={1890}
    fps={30}
    width={1920}
    height={1080}
  />
);

registerRoot(RemotionRoot);
