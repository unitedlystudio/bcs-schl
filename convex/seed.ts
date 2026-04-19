import { mutation } from './_generated/server';

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingConversations = await ctx.db.query('conversations').collect();
    const existingInbox = await ctx.db.query('inboxItems').collect();
    const existingAccess = await ctx.db.query('accessRecords').collect();
    const existingStudents = await ctx.db.query('students').collect();
    const existingAttendanceSessions = await ctx.db.query('attendanceSessions').collect();

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

    if (existingStudents.length === 0) {
      const students = [
        {
          preferredName: 'Emmy',
          fullName: 'Emmy Holloway',
          sex: 'F',
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
        }
      ] as const;

      await Promise.all(students.map((student) => ctx.db.insert('students', student)));
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

    return { ok: true };
  }
});
