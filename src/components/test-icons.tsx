import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function ConcreteCylinderIcon({ title, ...rest }: IconProps) {
  return (
    <svg {...base} {...rest}>
      {title && <title>{title}</title>}
      <ellipse cx="12" cy="5" rx="6" ry="2" />
      <path d="M6 5v14" />
      <path d="M18 5v14" />
      <ellipse cx="12" cy="19" rx="6" ry="2" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
    </svg>
  );
}

export function NuclearDensityIcon({ title, ...rest }: IconProps) {
  return (
    <svg {...base} {...rest}>
      {title && <title>{title}</title>}
      <rect x="5" y="4" width="14" height="11" rx="1.5" />
      <circle cx="12" cy="9.5" r="3" />
      <path d="M12 7v2.5l1.8 1" />
      <path d="M8 18l2 2h4l2-2" />
    </svg>
  );
}

export function ProofRollIcon({ title, ...rest }: IconProps) {
  return (
    <svg {...base} {...rest}>
      {title && <title>{title}</title>}
      <circle cx="7" cy="15" r="3.5" />
      <path d="M10.5 15h7" />
      <path d="M17.5 11v8" />
      <path d="M3 19h18" />
      <path d="M3 19v-1" />
      <path d="M21 19v-1" />
    </svg>
  );
}

export function DcpIcon({ title, ...rest }: IconProps) {
  return (
    <svg {...base} {...rest}>
      {title && <title>{title}</title>}
      <path d="M12 3v4" />
      <rect x="8.5" y="7" width="7" height="3" rx="0.5" />
      <path d="M12 10v10" />
      <path d="M10 20l2 2 2-2" />
      <path d="M4 14h3" />
      <path d="M4 17h3" />
      <path d="M17 14h3" />
      <path d="M17 17h3" />
    </svg>
  );
}

export function PileLoadIcon({ title, ...rest }: IconProps) {
  return (
    <svg {...base} {...rest}>
      {title && <title>{title}</title>}
      <path d="M4 6h16" />
      <path d="M7 6l1.5-2h7L17 6" />
      <rect x="9" y="8" width="6" height="14" rx="0.5" />
      <path d="M11 11v8" />
      <path d="M13 11v8" />
    </svg>
  );
}

const ICON_MAP = {
  concrete_field: ConcreteCylinderIcon,
  nuclear_density: NuclearDensityIcon,
  proof_roll: ProofRollIcon,
  dcp: DcpIcon,
  pile_load: PileLoadIcon,
} as const;

export function TestKindIcon({
  kind,
  ...rest
}: { kind: string } & IconProps) {
  const Icon = ICON_MAP[kind as keyof typeof ICON_MAP];
  if (!Icon) return null;
  return <Icon {...rest} />;
}
