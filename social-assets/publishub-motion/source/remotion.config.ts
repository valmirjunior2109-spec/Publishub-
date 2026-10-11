import { Config } from "@remotion/cli/config";

// quadros em PNG antes do H.264: o texto chega nítido ao encoder
Config.setVideoImageFormat("png");
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
