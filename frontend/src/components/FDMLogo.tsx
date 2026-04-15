import fdmLogo from './fdm-logo.png';

interface FDMLogoProps {
  height?: number;
}

export default function FDMLogo({ height = 32 }: FDMLogoProps) {
  return (
    <img 
      src={fdmLogo}
      height={height}
      alt="FDM Group"
      style={{ display: 'block' }}
    />
  );
}