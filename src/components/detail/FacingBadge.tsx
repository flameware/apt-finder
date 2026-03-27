import { Badge } from "@/components/ui/badge";
import type { FacingDirection, FacingConfidence } from "@/types";
import { facingLabel } from "@/lib/geo";

interface Props {
  facing: FacingDirection | null;
  confidence: FacingConfidence;
}

export function FacingBadge({ facing, confidence }: Props) {
  if (!facing) {
    return (
      <Badge variant="secondary" className="text-xs">
        방향 미확인
      </Badge>
    );
  }

  const isSouthFacing = facing === "S" || facing === "SE" || facing === "SW";
  const label = facingLabel(facing);
  const confidenceLabel = confidence === "api" ? "" : confidence === "mbr" ? " (추정)" : "";

  return (
    <Badge
      className={`text-xs ${
        isSouthFacing
          ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
          : "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"
      }`}
      variant="outline"
    >
      {label}{confidenceLabel}
    </Badge>
  );
}
