import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          "ios-src"?: string;
          alt?: string;
          poster?: string;
          ar?: boolean | "" | "true" | "false";
          "ar-modes"?: string;
          "ar-scale"?: string;
          "ar-placement"?: string;
          "camera-controls"?: boolean | "";
          "auto-rotate"?: boolean | "";
          "rotation-per-second"?: string;
          "shadow-intensity"?: string;
          "environment-image"?: string;
          exposure?: string;
          "tone-mapping"?: string;
          "interaction-prompt"?: string;
          loading?: "auto" | "lazy" | "eager";
          reveal?: "auto" | "interaction" | "manual";
          scale?: string;
          "min-camera-orbit"?: string;
          "max-camera-orbit"?: string;
        },
        HTMLElement
      >;
    }
  }
}
