import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About'
};

export default function AboutPage() {
  return (
    <div className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl'>
        {/* Header */}
        <div className='mb-12 text-center'>
          <h1 className='text-foreground text-3xl font-bold tracking-tight sm:text-4xl'>About</h1>
          <p className='text-muted-foreground mt-4 text-lg'>Learn more about Schly</p>
        </div>

        {/* Content Sections */}
        <div className='space-y-8'>
          {/* Product Section */}
          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>
              School Operations Platform
            </h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              Schly is a school operations workspace designed to keep student records, staffing,
              attendance, finance, admissions, and internal coordination in one place.
            </p>
          </section>

          {/* Purpose Section */}
          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>What Schly is for</h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              Schly is being shaped around real school workflows rather than generic dashboard
              demos. The product focuses on practical day-to-day operational visibility for school
              owners, admins, finance teams, teachers, and support staff.
            </p>
          </section>

          {/* Auth Section */}
          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>Authentication by Clerk</h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              Authentication for this application is securely handled by{' '}
              <a
                href='https://clerk.com'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary font-medium hover:underline'
              >
                Clerk
              </a>
              , a modern authentication and user management platform. Clerk provides secure sign-in,
              session management, and user data protection out of the box.
            </p>
          </section>

          {/* Data Privacy Section */}
          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>Data Privacy</h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              Schly is intended to handle sensitive school operations responsibly. Student, family,
              staffing, finance, and access information should be managed with careful permission
              controls and privacy-first operational practices.
            </p>
          </section>
        </div>

        {/* Footer Note */}
        <div className='mt-12 text-center'>
          <p className='text-muted-foreground text-sm'>
            Built for Schly with Next.js, Tailwind CSS, and shadcn/ui
          </p>
        </div>
      </div>
    </div>
  );
}
