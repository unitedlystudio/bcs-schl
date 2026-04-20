import { mutation } from './_generated/server';
import type { Id } from './_generated/dataModel';

function buildAcademicYearFromDate(dateValue?: string) {
  const trimmed = dateValue?.trim() ?? '';
  if (!trimmed) {
    return '';
  }

  const year = Number.parseInt(trimmed.slice(0, 4), 10);
  const month = Number.parseInt(trimmed.slice(5, 7), 10);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return '';
  }

  const startYear = month >= 7 ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
}

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingConversations = await ctx.db.query('conversations').collect();
    const existingInbox = await ctx.db.query('inboxItems').collect();
    const existingAccess = await ctx.db.query('accessRecords').collect();
    const existingStudents = await ctx.db.query('students').collect();
    const existingTeachers = await ctx.db.query('teachers').collect();
    const existingConcernCases = await ctx.db.query('concernCases').collect();
    const existingBillingProfiles = await ctx.db.query('studentBillingProfiles').collect();
    const existingAdmissions = await ctx.db.query('admissionsEnquiries').collect();
    const existingAttendanceSessions = await ctx.db.query('attendanceSessions').collect();
    const existingOperationTimeSlots = await ctx.db.query('operationsTimeSlots').collect();
    const existingTimetableEntries = await ctx.db.query('classTimetableEntries').collect();
    const existingOperationsOverrides = await ctx.db.query('operationsOverrides').collect();
    const existingStaffLeaveRequests = await ctx.db.query('staffLeaveRequests').collect();
    const existingStaffCoverAssignments = await ctx.db.query('staffCoverAssignments').collect();

    if (existingConversations.length === 0) {
      const alexId = await ctx.db.insert('conversations', {
        name: 'Alex from Support',
        title: 'Billing Follow-up',
        status: 'online',
        initials: 'AS',
        quickReplies: [
          'Thanks, please log that against the family profile.',
          'Can you send the reminder history as well?',
          'Loop finance in before closing this.'
        ],
        updatedAt: Date.now() - 1000 * 60 * 5
      });

      const priyaId = await ctx.db.insert('conversations', {
        name: 'Priya from Engineering',
        title: 'Convex Runtime Check',
        status: 'online',
        initials: 'PE',
        quickReplies: [
          'Please confirm the deployment is healthy.',
          'Can you share the failing request details?',
          'Let us keep this in the operational inbox.'
        ],
        updatedAt: Date.now() - 1000 * 60 * 30
      });

      const jordanId = await ctx.db.insert('conversations', {
        name: 'Jordan from Security',
        title: 'Account Access Review',
        status: 'offline',
        initials: 'JS',
        quickReplies: [
          'Please revoke any stale sessions.',
          'Reset the password and reissue access.',
          'Was any school data accessed?'
        ],
        updatedAt: Date.now() - 1000 * 60 * 60 * 24
      });

      await ctx.db.insert('messages', {
        conversationId: alexId,
        sender: 'contact',
        author: 'Alex',
        text: 'A parent billing question is still open. I have the reminder history ready if finance needs it.',
        timestampLabel: '10:02',
        createdAt: Date.now() - 1000 * 60 * 20
      });
      await ctx.db.insert('messages', {
        conversationId: alexId,
        sender: 'user',
        author: 'You',
        text: 'Thanks. Please keep it attached to the family thread so admin and finance both see it.',
        timestampLabel: '10:05',
        createdAt: Date.now() - 1000 * 60 * 18
      });
      await ctx.db.insert('messages', {
        conversationId: alexId,
        sender: 'contact',
        author: 'Alex',
        text: 'Done. I have also flagged it for overdue review in the inbox.',
        timestampLabel: '10:08',
        createdAt: Date.now() - 1000 * 60 * 15
      });

      await ctx.db.insert('messages', {
        conversationId: priyaId,
        sender: 'user',
        author: 'You',
        text: 'Can you confirm the Convex deployment is healthy after the latest inbox/chat migration?',
        timestampLabel: '09:15',
        createdAt: Date.now() - 1000 * 60 * 60
      });
      await ctx.db.insert('messages', {
        conversationId: priyaId,
        sender: 'contact',
        author: 'Priya',
        text: 'The deployment is up. I am checking the remaining logs and will post a status note in the operational inbox.',
        timestampLabel: '09:18',
        createdAt: Date.now() - 1000 * 60 * 55
      });
      await ctx.db.insert('messages', {
        conversationId: priyaId,
        sender: 'contact',
        author: 'Priya',
        text: 'The realtime subscriptions look stable. Next step is tightening auth on the backend functions.',
        timestampLabel: '09:25',
        createdAt: Date.now() - 1000 * 60 * 50
      });

      await ctx.db.insert('messages', {
        conversationId: jordanId,
        sender: 'contact',
        author: 'Jordan',
        text: 'We noticed an access review item that needs confirmation before school credentials are shared more broadly.',
        timestampLabel: 'Yesterday',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2
      });
      await ctx.db.insert('messages', {
        conversationId: jordanId,
        sender: 'user',
        author: 'You',
        text: 'Please revoke anything stale and keep the final note in the operational inbox.',
        timestampLabel: 'Yesterday',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000
      });
    }

    if (existingInbox.length === 0) {
      await ctx.db.insert('inboxItems', {
        title: 'Finance follow-up needs review',
        body: 'A parent billing thread is waiting for admin + accounts review before closure.',
        status: 'unread',
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        actions: [{ id: 'open-chat', label: 'Open thread', type: 'redirect', style: 'primary' }]
      });
      await ctx.db.insert('inboxItems', {
        title: 'Platform access record updated',
        body: 'One school credential record changed and should be checked in Platform Access.',
        status: 'unread',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        actions: [{ id: 'open-access', label: 'Open access', type: 'redirect', style: 'primary' }]
      });
      await ctx.db.insert('inboxItems', {
        title: 'Attendance escalation drafted',
        body: 'An attendance-related follow-up was drafted and is ready for triage in the operational inbox.',
        status: 'read',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        actions: [{ id: 'open-inbox', label: 'Review item', type: 'redirect', style: 'default' }]
      });
    }

    if (existingAccess.length === 0) {
      const accessRecords = [
        {
          category: 'Business Suite',
          platform: 'Google Account',
          fullName: '',
          loginUrl: 'https://accounts.google.com',
          username: '',
          password: '',
          listingUrl: '',
          adminsAccess: '',
          recoveryNumber: '',
          status: 'Partial'
        },
        {
          category: 'Business Suite',
          platform: 'Google Drive',
          fullName: '',
          loginUrl: 'https://drive.google.com',
          username: '',
          password: '',
          listingUrl: '',
          adminsAccess: '',
          recoveryNumber: '',
          status: 'Ready'
        },
        {
          category: 'Business Suite',
          platform: 'Zoom',
          fullName: '',
          loginUrl: 'https://zoom.us/signin',
          username: '',
          password: '',
          listingUrl: '',
          adminsAccess: '',
          recoveryNumber: '',
          status: 'Partial'
        },
        {
          category: 'Subscriptions',
          platform: 'Twinkl Subscription',
          fullName: '',
          loginUrl: 'https://www.twinkl.com',
          username: '',
          password: '',
          listingUrl: '',
          adminsAccess: '',
          recoveryNumber: '',
          status: 'Partial'
        },
        {
          category: 'Social Media',
          platform: 'Instagram',
          fullName: '',
          loginUrl: 'https://www.instagram.com/accounts/login',
          username: '',
          password: '',
          listingUrl: '',
          adminsAccess: '',
          recoveryNumber: '',
          status: 'Partial'
        }
      ] as const;

      await Promise.all(
        accessRecords.map((record, index) =>
          ctx.db.insert('accessRecords', {
            ...record,
            sortOrder: index + 1
          })
        )
      );
    }

    const students = [
      {
        preferredName: 'Emmy',
        fullName: 'Emmy Holloway',
        sex: 'F',
        academicYear: '2024/2025',
        className: 'Class 2',
        dateOfBirth: '2018-04-11',
        dateJoined: '2024-07-08',
        nisn: 'SCHLY-0001',
        religion: 'Hindu',
        status: 'Active',
        guardianName: 'Lara Holloway',
        guardianPhone: '+62 812 0000 1001',
        medicalFlag: 'Dairy free',
        notesSummary: 'Needs gentle lunch monitoring.',
        sortName: 'Emmy Holloway'
      },
      {
        preferredName: 'Bjorn',
        fullName: 'Bjorn Patten',
        sex: 'M',
        academicYear: '2024/2025',
        className: 'Class 5',
        dateOfBirth: '2015-09-22',
        dateJoined: '2023-01-15',
        nisn: 'SCHLY-0002',
        religion: 'Christian',
        status: 'Active',
        guardianName: 'Maya Patten',
        guardianPhone: '+62 812 0000 1002',
        medicalFlag: '',
        notesSummary: 'Strong reader, no urgent concerns.',
        sortName: 'Bjorn Patten'
      },
      {
        preferredName: 'Naia',
        fullName: 'Naia Satria',
        sex: 'F',
        academicYear: '2025/2026',
        className: 'Class 2',
        dateOfBirth: '2018-01-09',
        dateJoined: '2025-01-13',
        nisn: 'SCHLY-0003',
        religion: 'Islam',
        status: 'Pending',
        guardianName: 'Rina Satria',
        guardianPhone: '+62 812 0000 1003',
        medicalFlag: 'Vegetarian',
        notesSummary: 'Recently onboarded, documents still being completed.',
        sortName: 'Naia Satria'
      },
      {
        preferredName: 'Kai',
        fullName: 'Kai Gen Delgado',
        sex: 'M',
        academicYear: '2024/2025',
        className: 'Class 4',
        dateOfBirth: '2016-11-03',
        dateJoined: '2022-08-01',
        nisn: 'SCHLY-0004',
        religion: 'Hindu',
        status: 'Active',
        guardianName: 'Dewi Delgado',
        guardianPhone: '+62 812 0000 1004',
        medicalFlag: 'Asthma note',
        notesSummary: 'Keep inhaler details visible to operations.',
        sortName: 'Kai Gen Delgado'
      },
      {
        preferredName: 'Mila',
        fullName: 'Mila Prasetyo',
        sex: 'F',
        academicYear: '2025/2026',
        className: 'Class 1',
        dateOfBirth: '2019-02-14',
        dateJoined: '2026-04-15',
        nisn: 'SCHLY-0005',
        religion: 'Christian',
        status: 'Active',
        guardianName: 'Nadia Prasetyo',
        guardianPhone: '+62 812 2000 1105',
        medicalFlag: '',
        notesSummary: 'Recently converted from admissions and settling into the morning routine.',
        sortName: 'Mila Prasetyo'
      }
    ] as const;

    if (existingStudents.length < students.length) {
      const existingStudentNames = new Set(existingStudents.map((student) => student.fullName));
      const missingStudents = students.filter(
        (student) => !existingStudentNames.has(student.fullName)
      );

      await Promise.all(missingStudents.map((student) => ctx.db.insert('students', student)));
    }

    await Promise.all(
      existingStudents
        .filter((student) => !student.academicYear)
        .map((student) =>
          ctx.db.patch(student._id, {
            academicYear: buildAcademicYearFromDate(student.dateJoined)
          })
        )
    );

    if (existingTeachers.length === 0) {
      const teachers = [
        {
          fullName: 'Alya Rahman',
          preferredName: 'Alya',
          role: 'Homeroom Teacher',
          status: 'Active',
          academicYear: '2025/2026',
          homeroomClass: 'Class 2',
          email: 'alya.rahman@schly.school',
          phone: '+62 812 3000 2101',
          sortName: 'Alya Rahman'
        },
        {
          fullName: 'Marcus Tan',
          preferredName: 'Marcus',
          role: 'Teacher',
          status: 'Active',
          academicYear: '2025/2026',
          homeroomClass: 'Class 5',
          email: 'marcus.tan@schly.school',
          phone: '+62 812 3000 2102',
          sortName: 'Marcus Tan'
        },
        {
          fullName: 'Fitria Mahesa',
          preferredName: 'Fitria',
          role: 'Teaching Assistant',
          status: 'Active',
          academicYear: '2025/2026',
          homeroomClass: 'Class 2',
          email: 'fitria.mahesa@schly.school',
          phone: '+62 812 3000 2103',
          sortName: 'Fitria Mahesa'
        }
      ] as const;

      await Promise.all(teachers.map((teacher) => ctx.db.insert('teachers', teacher)));
    }

    if (existingConcernCases.length === 0) {
      const seededStudents = await ctx.db
        .query('students')
        .withIndex('by_sortName')
        .order('asc')
        .collect();
      const seededTeachers = await ctx.db
        .query('teachers')
        .withIndex('by_sortName')
        .order('asc')
        .collect();
      const studentByName = new Map(seededStudents.map((student) => [student.fullName, student]));
      const teacherByName = new Map(seededTeachers.map((teacher) => [teacher.fullName, teacher]));

      const concernCases = [
        {
          studentName: 'Naia Satria',
          title: 'Onboarding readiness and document completion',
          category: 'Learning Support',
          severity: 'Medium',
          status: 'Monitoring',
          visibility: 'Standard',
          assignedTeacherName: 'Alya Rahman',
          summary:
            'New starter is settling in well, but several onboarding documents and routine checks still need follow-up.',
          nextReviewDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
          updates: [
            {
              authorLabel: 'Admissions handoff',
              note: 'Family paperwork is still being completed, and class routines are being phased in gradually.'
            }
          ]
        },
        {
          studentName: 'Kai Gen Delgado',
          title: 'Asthma management plan visibility',
          category: 'Medical',
          severity: 'High',
          status: 'Open',
          visibility: 'Restricted',
          assignedTeacherName: 'Marcus Tan',
          summary:
            'Operations needs a clearer shared plan for inhaler handling, PE participation, and escalation if symptoms increase.',
          nextReviewDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10),
          updates: [
            {
              authorLabel: 'Operations note',
              note: 'Current record mentions asthma, but escalation guidance still needs to be captured more explicitly.'
            }
          ]
        }
      ] as const;

      for (const concernCase of concernCases) {
        const student = studentByName.get(concernCase.studentName);
        if (!student) {
          continue;
        }

        const teacher = teacherByName.get(concernCase.assignedTeacherName);
        const updatedAt = Date.now();
        const caseId = await ctx.db.insert('concernCases', {
          studentId: student._id,
          title: concernCase.title,
          category: concernCase.category,
          severity: concernCase.severity,
          status: concernCase.status,
          visibility: concernCase.visibility,
          assignedTeacherId: teacher?._id,
          summary: concernCase.summary,
          nextReviewDate: concernCase.nextReviewDate,
          updatedAt,
          sortKey: `${updatedAt}::${concernCase.title.toLowerCase()}`
        });

        for (const update of concernCase.updates) {
          await ctx.db.insert('concernCaseUpdates', {
            caseId,
            note: update.note,
            authorLabel: update.authorLabel,
            createdAt: updatedAt
          });
        }
      }
    }

    if (existingBillingProfiles.length === 0) {
      const seededStudents = await ctx.db
        .query('students')
        .withIndex('by_sortName')
        .order('asc')
        .collect();
      const studentByName = new Map(seededStudents.map((student) => [student.fullName, student]));

      const profiles = [
        {
          studentName: 'Emmy Holloway',
          baseMonthlyFee: 450,
          billingStatus: 'Current',
          scholarshipType: undefined,
          scholarshipPercent: 0,
          customMonthlyFee: undefined,
          arrearsBalance: 0,
          paymentPlan: 'Standard monthly tuition',
          familyLabel: 'Holloway family account',
          collectionStage: 'No follow-up',
          reminderChannel: 'Not set',
          lastReminderDate: '',
          nextActionDate: '',
          notesSummary: 'Current family account with no arrears.',
          charges: [
            {
              title: 'May tuition',
              category: 'Tuition',
              amount: 450,
              chargeDate: new Date().toISOString().slice(0, 10),
              dueDate: new Date().toISOString().slice(0, 10),
              status: 'Pending'
            }
          ],
          payments: [
            {
              amount: 450,
              paidAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString().slice(0, 10),
              method: 'Bank Transfer',
              reference: 'EMMY-APR',
              note: 'April tuition settled in full.'
            }
          ]
        },
        {
          studentName: 'Bjorn Patten',
          baseMonthlyFee: 520,
          billingStatus: 'Overdue',
          scholarshipType: undefined,
          scholarshipPercent: 0,
          customMonthlyFee: undefined,
          arrearsBalance: 180,
          paymentPlan: 'Monthly with arrears catch-up',
          familyLabel: 'Patten siblings account',
          collectionStage: 'Reminder queued',
          reminderChannel: 'WhatsApp',
          lastReminderDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
            .toISOString()
            .slice(0, 10),
          nextActionDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10),
          notesSummary: 'Accounts is monitoring an overdue balance and staggered recovery plan.',
          charges: [
            {
              title: 'May tuition',
              category: 'Tuition',
              amount: 520,
              chargeDate: new Date().toISOString().slice(0, 10),
              dueDate: new Date().toISOString().slice(0, 10),
              status: 'Overdue'
            }
          ],
          payments: [
            {
              amount: 340,
              paidAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString().slice(0, 10),
              method: 'Cash',
              reference: 'BJORN-PART',
              note: 'Partial payment received; remainder moved into arrears plan.'
            }
          ]
        },
        {
          studentName: 'Naia Satria',
          baseMonthlyFee: 480,
          billingStatus: 'Scholarship',
          scholarshipType: 'Partial Scholarship',
          scholarshipPercent: 50,
          customMonthlyFee: undefined,
          arrearsBalance: 0,
          paymentPlan: 'Scholarship-adjusted monthly fee',
          familyLabel: 'Satria family account',
          collectionStage: 'In contact',
          reminderChannel: 'Email',
          lastReminderDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
            .toISOString()
            .slice(0, 10),
          nextActionDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
            .toISOString()
            .slice(0, 10),
          notesSummary: 'Partial scholarship applied during onboarding period.',
          charges: [
            {
              title: 'May tuition',
              category: 'Tuition',
              amount: 240,
              chargeDate: new Date().toISOString().slice(0, 10),
              dueDate: new Date().toISOString().slice(0, 10),
              status: 'Pending'
            }
          ],
          payments: []
        }
      ] as const;

      for (const profile of profiles) {
        const student = studentByName.get(profile.studentName);
        if (!student) continue;

        const updatedAt = Date.now();
        const billingProfileId = await ctx.db.insert('studentBillingProfiles', {
          studentId: student._id,
          baseMonthlyFee: profile.baseMonthlyFee,
          billingStatus: profile.billingStatus,
          scholarshipType: profile.scholarshipType,
          scholarshipPercent: profile.scholarshipPercent,
          customMonthlyFee: profile.customMonthlyFee,
          arrearsBalance: profile.arrearsBalance,
          paymentPlan: profile.paymentPlan,
          familyLabel: profile.familyLabel,
          collectionStage: profile.collectionStage,
          reminderChannel: profile.reminderChannel,
          lastReminderDate: profile.lastReminderDate,
          nextActionDate: profile.nextActionDate,
          notesSummary: profile.notesSummary,
          updatedAt
        });

        for (const charge of profile.charges) {
          await ctx.db.insert('financeCharges', {
            billingProfileId,
            title: charge.title,
            category: charge.category,
            amount: charge.amount,
            chargeDate: charge.chargeDate,
            dueDate: charge.dueDate,
            status: charge.status,
            updatedAt
          });
        }

        for (const payment of profile.payments) {
          await ctx.db.insert('financePayments', {
            billingProfileId,
            amount: payment.amount,
            paidAt: payment.paidAt,
            method: payment.method,
            reference: payment.reference,
            note: payment.note,
            createdAt: updatedAt
          });
        }
      }
    }

    if (existingAdmissions.length === 0) {
      const enquiries = [
        {
          studentName: 'Sofia Hartono',
          familyName: 'Hartono',
          classInterest: 'Class 1',
          guardianName: 'Mira Hartono',
          guardianPhone: '+62 812 2000 1101',
          source: 'Instagram',
          enquiryDate: '2026-04-14',
          stage: 'New',
          status: 'Active',
          notesSummary: 'Asked for pricing and schedule overview.',
          sortName: 'Sofia Hartono',
          updatedAt: Date.now() - 1000 * 60 * 90
        },
        {
          studentName: 'Noah Wijaya',
          familyName: 'Wijaya',
          classInterest: 'Class 3',
          guardianName: 'Daniel Wijaya',
          guardianPhone: '+62 812 2000 1102',
          source: 'Website form',
          enquiryDate: '2026-04-12',
          stage: 'Tour Scheduled',
          status: 'Waiting',
          notesSummary: 'Tour booked for next Thursday morning.',
          sortName: 'Noah Wijaya',
          updatedAt: Date.now() - 1000 * 60 * 60 * 8
        },
        {
          studentName: 'Luna Permata',
          familyName: 'Permata',
          classInterest: 'Class 2',
          guardianName: 'Siska Permata',
          guardianPhone: '+62 812 2000 1103',
          source: 'Referral',
          enquiryDate: '2026-04-08',
          stage: 'Application in Progress',
          status: 'Active',
          notesSummary: 'Waiting on one remaining document upload.',
          sortName: 'Luna Permata',
          updatedAt: Date.now() - 1000 * 60 * 60 * 4
        },
        {
          studentName: 'Arlo Santoso',
          familyName: 'Santoso',
          classInterest: 'Class 4',
          guardianName: 'Rani Santoso',
          guardianPhone: '+62 812 2000 1104',
          source: 'WhatsApp',
          enquiryDate: '2026-04-05',
          stage: 'Decision Pending',
          status: 'Waiting',
          notesSummary: 'Family requested one more curriculum call before confirming.',
          sortName: 'Arlo Santoso',
          updatedAt: Date.now() - 1000 * 60 * 60 * 26
        },
        {
          studentName: 'Mila Prasetyo',
          familyName: 'Prasetyo',
          classInterest: 'Class 1',
          guardianName: 'Nadia Prasetyo',
          guardianPhone: '+62 812 2000 1105',
          source: 'Open day',
          enquiryDate: '2026-03-29',
          stage: 'Enrolled',
          status: 'Won',
          notesSummary: 'Seat confirmed and onboarding pack sent.',
          sortName: 'Mila Prasetyo',
          updatedAt: Date.now() - 1000 * 60 * 60 * 48
        }
      ] as const;

      await Promise.all(enquiries.map((enquiry) => ctx.db.insert('admissionsEnquiries', enquiry)));
    }

    if (existingAttendanceSessions.length === 0) {
      const students = await ctx.db
        .query('students')
        .withIndex('by_sortName')
        .order('asc')
        .collect();
      const studentByPreferredName = new Map(
        students.map((student) => [student.preferredName, student])
      );
      const today = new Date();
      const todayLabel = today.toISOString().slice(0, 10);
      const yesterday = new Date(today.getTime() - 1000 * 60 * 60 * 24);
      const yesterdayLabel = yesterday.toISOString().slice(0, 10);

      const class2SessionId = await ctx.db.insert('attendanceSessions', {
        className: 'Class 2',
        sessionDate: todayLabel,
        status: 'Completed',
        notesSummary: 'Morning register completed before assembly.',
        sortKey: `${todayLabel}::class 2`,
        updatedAt: Date.now() - 1000 * 60 * 15
      });

      const class5SessionId = await ctx.db.insert('attendanceSessions', {
        className: 'Class 5',
        sessionDate: yesterdayLabel,
        status: 'In progress',
        notesSummary: 'Late arrivals still being checked against transport logs.',
        sortKey: `${yesterdayLabel}::class 5`,
        updatedAt: Date.now() - 1000 * 60 * 60 * 18
      });

      if (studentByPreferredName.get('Emmy')) {
        await ctx.db.insert('attendanceRecords', {
          sessionId: class2SessionId,
          studentId: studentByPreferredName.get('Emmy')!._id,
          status: 'Present',
          note: '',
          updatedAt: Date.now() - 1000 * 60 * 14
        });
      }

      if (studentByPreferredName.get('Naia')) {
        await ctx.db.insert('attendanceRecords', {
          sessionId: class2SessionId,
          studentId: studentByPreferredName.get('Naia')!._id,
          status: 'Late',
          note: 'Arrival confirmed after gate check.',
          updatedAt: Date.now() - 1000 * 60 * 13
        });
      }

      if (studentByPreferredName.get('Bjorn')) {
        await ctx.db.insert('attendanceRecords', {
          sessionId: class5SessionId,
          studentId: studentByPreferredName.get('Bjorn')!._id,
          status: 'Absent',
          note: 'Family called in sick leave.',
          updatedAt: Date.now() - 1000 * 60 * 60 * 17
        });
      }
    }

    if (existingOperationTimeSlots.length === 0) {
      const timeSlots = [
        {
          label: 'Arrival & drop-off',
          startTime: '07:45',
          endTime: '08:15',
          blockType: 'Arrival',
          sortOrder: 1,
          isActive: true
        },
        {
          label: 'Assembly / morning routine',
          startTime: '08:15',
          endTime: '08:35',
          blockType: 'Assembly',
          sortOrder: 2,
          isActive: true
        },
        {
          label: 'Block 1',
          startTime: '08:35',
          endTime: '09:30',
          blockType: 'Lesson',
          sortOrder: 3,
          isActive: true
        },
        {
          label: 'Snack break',
          startTime: '09:30',
          endTime: '09:50',
          blockType: 'Break',
          sortOrder: 4,
          isActive: true
        },
        {
          label: 'Block 2',
          startTime: '09:50',
          endTime: '10:45',
          blockType: 'Lesson',
          sortOrder: 5,
          isActive: true
        },
        {
          label: 'Specialist / project',
          startTime: '10:45',
          endTime: '11:30',
          blockType: 'Specialist',
          sortOrder: 6,
          isActive: true
        },
        {
          label: 'Lunch',
          startTime: '11:30',
          endTime: '12:15',
          blockType: 'Lunch',
          sortOrder: 7,
          isActive: true
        },
        {
          label: 'Block 3',
          startTime: '12:15',
          endTime: '13:10',
          blockType: 'Lesson',
          sortOrder: 8,
          isActive: true
        },
        {
          label: 'Dismissal prep',
          startTime: '13:10',
          endTime: '13:30',
          blockType: 'Dismissal',
          sortOrder: 9,
          isActive: true
        }
      ] as const;

      for (const slot of timeSlots) {
        await ctx.db.insert('operationsTimeSlots', slot);
      }
    }

    if (existingTimetableEntries.length === 0 || existingOperationsOverrides.length === 0) {
      const [students, teachers, timeSlots] = await Promise.all([
        ctx.db.query('students').withIndex('by_sortName').order('asc').collect(),
        ctx.db.query('teachers').withIndex('by_sortName').order('asc').collect(),
        ctx.db.query('operationsTimeSlots').withIndex('by_sortOrder').order('asc').collect()
      ]);

      const studentByPreferredName = new Map(
        students.map((student) => [student.preferredName, student])
      );
      const teacherByPreferredName = new Map(
        teachers.map((teacher) => [teacher.preferredName, teacher])
      );
      const slotByLabel = new Map(timeSlots.map((slot) => [slot.label, slot]));

      if (existingTimetableEntries.length === 0) {
        const timetableEntries = [
          {
            academicYear: '2024/2025',
            className: 'Class 2',
            weekday: 'Monday',
            timeSlotLabel: 'Block 1',
            activityTitle: 'Numeracy small groups',
            area: 'Maths',
            leadTeacherName: 'Alya',
            location: 'Class 2 room',
            specialistLabel: '',
            lunchLabel: '',
            themeLabel: 'Confidence',
            note: 'Keep one table free for targeted support.'
          },
          {
            academicYear: '2024/2025',
            className: 'Class 2',
            weekday: 'Tuesday',
            timeSlotLabel: 'Specialist / project',
            activityTitle: 'Music rotation',
            area: 'Specialist',
            leadTeacherName: 'Marcus',
            location: 'Music corner',
            specialistLabel: 'Music',
            lunchLabel: '',
            themeLabel: '',
            note: 'Split into 2 groups for instrument setup.'
          },
          {
            academicYear: '2024/2025',
            className: 'Class 2',
            weekday: 'Wednesday',
            timeSlotLabel: 'Lunch',
            activityTitle: 'Infants lunch flow',
            area: 'Operations',
            leadTeacherName: 'Alya',
            location: 'Lunch zone A',
            specialistLabel: '',
            lunchLabel: 'Infants lunch',
            themeLabel: '',
            note: 'Watch Emmy dairy-free meal separately.'
          },
          {
            academicYear: '2024/2025',
            className: 'Class 5',
            weekday: 'Monday',
            timeSlotLabel: 'Block 2',
            activityTitle: 'Literacy workshop',
            area: 'English',
            leadTeacherName: 'Marcus',
            location: 'Class 5 room',
            specialistLabel: '',
            lunchLabel: '',
            themeLabel: 'Responsibility',
            note: 'Use reading conference rotation.'
          },
          {
            academicYear: '2024/2025',
            className: 'Class 5',
            weekday: 'Thursday',
            timeSlotLabel: 'Specialist / project',
            activityTitle: 'Sports specialist',
            area: 'Specialist',
            leadTeacherName: 'Marcus',
            location: 'Field',
            specialistLabel: 'Sport',
            lunchLabel: '',
            themeLabel: '',
            note: 'Cover hydration checks before lunch.'
          }
        ] as const;

        for (const entry of timetableEntries) {
          const slot = slotByLabel.get(entry.timeSlotLabel);
          const teacher = teacherByPreferredName.get(entry.leadTeacherName);
          if (!slot) continue;
          await ctx.db.insert('classTimetableEntries', {
            academicYear: entry.academicYear,
            className: entry.className,
            weekday: entry.weekday,
            timeSlotId: slot._id,
            activityTitle: entry.activityTitle,
            area: entry.area,
            leadTeacherId: teacher?._id,
            location: entry.location,
            specialistLabel: entry.specialistLabel,
            lunchLabel: entry.lunchLabel,
            themeLabel: entry.themeLabel,
            note: entry.note,
            updatedAt: Date.now() - 1000 * 60 * 45
          });
        }
      }

      if (existingOperationsOverrides.length === 0) {
        const todayLabel = new Date().toISOString().slice(0, 10);
        const tomorrowLabel = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
        const block1 = slotByLabel.get('Block 1');
        const lunch = slotByLabel.get('Lunch');
        const specialist = slotByLabel.get('Specialist / project');
        const alya = teacherByPreferredName.get('Alya');
        const marcus = teacherByPreferredName.get('Marcus');
        const emmy = studentByPreferredName.get('Emmy');
        const bjorn = studentByPreferredName.get('Bjorn');

        const overrides = [
          {
            overrideDate: todayLabel,
            academicYear: '2024/2025',
            className: 'Class 2',
            timeSlotId: lunch?._id,
            overrideType: 'Medical',
            status: 'Open',
            teacherId: alya?._id,
            studentId: emmy?._id,
            title: 'Lunch allergy check',
            summary: 'Confirm Emmy receives the dairy-free lunch plate before the main handout.',
            updatedAt: Date.now() - 1000 * 60 * 20
          },
          {
            overrideDate: todayLabel,
            academicYear: '2024/2025',
            className: 'Class 5',
            timeSlotId: specialist?._id,
            overrideType: 'Cover',
            status: 'Confirmed',
            teacherId: marcus?._id,
            studentId: undefined,
            title: 'Sports cover confirmed',
            summary:
              'Marcus is covering the specialist sports block while the external coach is away.',
            updatedAt: Date.now() - 1000 * 60 * 40
          },
          {
            overrideDate: tomorrowLabel,
            academicYear: '2024/2025',
            className: 'Class 5',
            timeSlotId: block1?._id,
            overrideType: 'Absence',
            status: 'Open',
            teacherId: marcus?._id,
            studentId: bjorn?._id,
            title: 'Family follow-up for absence',
            summary: 'Prepare attendance follow-up if Bjorn is absent again tomorrow morning.',
            updatedAt: Date.now() - 1000 * 60 * 10
          }
        ] as const;

        for (const override of overrides) {
          await ctx.db.insert('operationsOverrides', {
            overrideDate: override.overrideDate,
            academicYear: override.academicYear,
            className: override.className,
            timeSlotId: override.timeSlotId,
            overrideType: override.overrideType,
            status: override.status,
            teacherId: override.teacherId,
            studentId: override.studentId,
            title: override.title,
            summary: override.summary,
            updatedAt: override.updatedAt
          });
        }
      }
    }

    if (existingStaffLeaveRequests.length === 0 && existingStaffCoverAssignments.length === 0) {
      const teachers = await ctx.db
        .query('teachers')
        .withIndex('by_sortName')
        .order('asc')
        .collect();
      const teacherByPreferredName = new Map(
        teachers.map((teacher) => [teacher.preferredName, teacher])
      );
      const todayLabel = new Date().toISOString().slice(0, 10);
      const tomorrowLabel = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
      const twoDaysOutLabel = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString().slice(0, 10);
      const alya = teacherByPreferredName.get('Alya');
      const marcus = teacherByPreferredName.get('Marcus');
      const fitria = teacherByPreferredName.get('Fitria');

      const leaveRequestsByTeacher: {
        alya?: { id: Id<'staffLeaveRequests'>; startDate: string; endDate: string };
        marcus?: { id: Id<'staffLeaveRequests'>; startDate: string; endDate: string };
      } = {};

      if (existingStaffLeaveRequests.length === 0) {
        if (alya) {
          leaveRequestsByTeacher.alya = {
            id: await ctx.db.insert('staffLeaveRequests', {
              teacherId: alya._id,
              leaveType: 'Training',
              startDate: tomorrowLabel,
              endDate: twoDaysOutLabel,
              status: 'Approved',
              reason:
                'External literacy training with afternoon handoff back to homeroom planning.',
              notesSummary: 'Generate cover for Class 2 numeracy and lunch flow blocks.',
              requestedBy: 'Admin',
              updatedAt: Date.now() - 1000 * 60 * 50
            }),
            startDate: tomorrowLabel,
            endDate: twoDaysOutLabel
          };
        }

        if (marcus) {
          leaveRequestsByTeacher.marcus = {
            id: await ctx.db.insert('staffLeaveRequests', {
              teacherId: marcus._id,
              leaveType: 'Sick',
              startDate: todayLabel,
              endDate: todayLabel,
              status: 'Requested',
              reason: 'Same-day sick leave notice before the specialist sports rotation.',
              notesSummary: 'Leadership needs to confirm same-day specialist cover.',
              requestedBy: 'Teacher',
              updatedAt: Date.now() - 1000 * 60 * 15
            }),
            startDate: todayLabel,
            endDate: todayLabel
          };
        }
      }

      if (existingStaffLeaveRequests.length === 0 && existingStaffCoverAssignments.length === 0) {
        if (leaveRequestsByTeacher.alya && alya) {
          await ctx.db.insert('staffCoverAssignments', {
            leaveRequestId: leaveRequestsByTeacher.alya.id,
            coverDate: leaveRequestsByTeacher.alya.startDate,
            className: 'Class 2',
            timeSlotLabel: 'Block 1',
            primaryTeacherId: alya._id,
            coverTeacherId: fitria?._id,
            status: 'Assigned',
            note: 'Numeracy small groups still need the targeted support table setup.',
            updatedAt: Date.now() - 1000 * 60 * 30
          });
          await ctx.db.insert('staffCoverAssignments', {
            leaveRequestId: leaveRequestsByTeacher.alya.id,
            coverDate:
              leaveRequestsByTeacher.alya.endDate >= leaveRequestsByTeacher.alya.startDate
                ? leaveRequestsByTeacher.alya.endDate
                : leaveRequestsByTeacher.alya.startDate,
            className: 'Class 2',
            timeSlotLabel: 'Lunch',
            primaryTeacherId: alya._id,
            coverTeacherId: fitria?._id,
            status: 'Confirmed',
            note: 'Keep dairy-free lunch check visible for Emmy during handoff.',
            updatedAt: Date.now() - 1000 * 60 * 20
          });
        }

        if (leaveRequestsByTeacher.marcus && marcus) {
          await ctx.db.insert('staffCoverAssignments', {
            leaveRequestId: leaveRequestsByTeacher.marcus.id,
            coverDate: leaveRequestsByTeacher.marcus.startDate,
            className: 'Class 5',
            timeSlotLabel: 'Specialist / project',
            primaryTeacherId: marcus._id,
            coverTeacherId: undefined,
            status: 'Open',
            note: 'Sports specialist block still needs a same-day cover owner.',
            updatedAt: Date.now() - 1000 * 60 * 10
          });
        }
      }
    }

    return { ok: true };
  }
});
