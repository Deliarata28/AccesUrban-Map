import type { NavigationItem } from "../types/navigation";

export const mainNavigation: NavigationItem[] = [
  { label: "Acasă", href: "/home#acasa" },
  { label: "Hartă", href: "/map" },
  { label: "Trebuie să știi", href: "/home#cum-ajuta" },
  { label: "Facilități", href: "/home#facilitati" },
  { label: "Programe", href: "/programe" },
  { label: "Contacte", href: "/contacte" },
];

export const footerNavigation: NavigationItem[] = [
  { label: "Hartă", href: "/map" },
  { label: "Programe", href: "/programe" },
  { label: "Contacte", href: "/contacte" },
];
