import logo from "../assets/logo.png";

export function BrandHeader() {
  return (
    <header className="brand-header">
      <img className="app-brand-logo auth-brand-logo" src={logo} alt="Logo de TravelSplit" />
    </header>
  );
}
