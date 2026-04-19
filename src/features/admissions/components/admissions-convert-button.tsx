'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';

type AdmissionsConvertButtonProps = {
  enquiryId: string;
  convertedStudentId?: string | null;
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
};

export function AdmissionsConvertButton({
  enquiryId,
  convertedStudentId,
  buttonSize = 'sm',
  className
}: AdmissionsConvertButtonProps) {
  const router = useRouter();
  const convertToStudent = useMutation(api.admissions.convertToStudent);
  const [submitting, setSubmitting] = useState(false);

  if (convertedStudentId) {
    return (
      <Button
        type='button'
        size={buttonSize}
        variant='secondary'
        className={className}
        onClick={() => router.push(`/dashboard/students/${convertedStudentId}`)}
      >
        <Icons.user className='h-4 w-4' /> View student
      </Button>
    );
  }

  return (
    <Button
      type='button'
      size={buttonSize}
      variant='default'
      className={className}
      isLoading={submitting}
      onClick={async () => {
        try {
          setSubmitting(true);
          const result = await convertToStudent({
            enquiryId: enquiryId as Id<'admissionsEnquiries'>
          });
          toast.success(
            result.reusedExistingStudent
              ? 'Admissions enquiry linked to an existing student'
              : 'Admissions enquiry converted into a student'
          );
          router.push(`/dashboard/students/${result.studentId}`);
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Failed to convert admissions enquiry'
          );
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <Icons.check className='h-4 w-4' /> Convert to student
    </Button>
  );
}
