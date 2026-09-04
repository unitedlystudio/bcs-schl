import Script from 'next/script';

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id='scrub-schly-invite'
        strategy='beforeInteractive'
      >{`try{const u=new URL(location.href);const t=u.searchParams.get('invite');if(t){window.__SCHLY_INVITE_TOKEN__=t;u.searchParams.delete('invite');history.replaceState({},'',u.pathname+u.search+u.hash)}}catch{}`}</Script>
      {children}
    </>
  );
}
