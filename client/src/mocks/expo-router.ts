// Mock expo-router for web builds
export const Redirect = ({ href }: { href: string }) => {
  // For web, we'll use window.location for navigation
  if (typeof window !== 'undefined') {
    window.location.href = href;
  }
  return null;
};

export const useRouter = () => ({
  push: (href: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = href;
    }
  },
  replace: (href: string) => {
    if (typeof window !== 'undefined') {
      window.location.replace(href);
    }
  },
  back: () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  },
});

export const useLocalSearchParams = () => ({});
export const useGlobalSearchParams = () => ({});
export const usePathname = () => {
  if (typeof window !== 'undefined') {
    return window.location.pathname;
  }
  return '/';
};

export const Link = ({ href, children, ...props }: any) => {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
};

export const Stack = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>;
};

export const Tabs = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>;
};

export const Slot = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>;
};

export default {
  Redirect,
  useRouter,
  useLocalSearchParams,
  useGlobalSearchParams,
  usePathname,
  Link,
  Stack,
  Tabs,
  Slot,
};
