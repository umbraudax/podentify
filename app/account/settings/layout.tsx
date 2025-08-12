import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Settings',
};

export default function AccountSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


