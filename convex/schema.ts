import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  conversations: defineTable({
    name: v.string(),
    title: v.string(),
    status: v.union(v.literal('online'), v.literal('offline')),
    initials: v.string(),
    quickReplies: v.array(v.string()),
    updatedAt: v.number()
  }).index('by_updatedAt', ['updatedAt']),

  messages: defineTable({
    conversationId: v.id('conversations'),
    sender: v.union(v.literal('user'), v.literal('contact')),
    author: v.string(),
    text: v.string(),
    timestampLabel: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          size: v.number(),
          type: v.string()
        })
      )
    ),
    createdAt: v.number()
  }).index('by_conversation', ['conversationId', 'createdAt']),

  inboxItems: defineTable({
    title: v.string(),
    body: v.string(),
    status: v.union(v.literal('unread'), v.literal('read'), v.literal('archived')),
    createdAt: v.string(),
    actions: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          type: v.union(
            v.literal('redirect'),
            v.literal('api_call'),
            v.literal('workflow'),
            v.literal('modal')
          ),
          style: v.optional(
            v.union(v.literal('primary'), v.literal('danger'), v.literal('default'))
          ),
          executed: v.optional(v.boolean())
        })
      )
    )
  })
    .index('by_createdAt', ['createdAt'])
    .index('by_status', ['status', 'createdAt']),

  accessRecords: defineTable({
    category: v.union(
      v.literal('Business Suite'),
      v.literal('Subscriptions'),
      v.literal('Social Media')
    ),
    platform: v.string(),
    fullName: v.string(),
    loginUrl: v.string(),
    username: v.string(),
    password: v.string(),
    listingUrl: v.string(),
    adminsAccess: v.string(),
    recoveryNumber: v.string(),
    status: v.union(v.literal('Needs setup'), v.literal('Partial'), v.literal('Ready')),
    sortOrder: v.number()
  })
    .index('by_sortOrder', ['sortOrder'])
    .index('by_category', ['category', 'sortOrder'])
    .index('by_status', ['status', 'sortOrder']),

  students: defineTable({
    preferredName: v.string(),
    fullName: v.string(),
    sex: v.union(v.literal('M'), v.literal('F'), v.literal('Unknown')),
    academicYear: v.optional(v.string()),
    className: v.string(),
    dateOfBirth: v.string(),
    dateJoined: v.string(),
    nisn: v.string(),
    religion: v.string(),
    status: v.union(v.literal('Active'), v.literal('Pending'), v.literal('Archived')),
    guardianName: v.string(),
    guardianPhone: v.string(),
    medicalFlag: v.optional(v.string()),
    notesSummary: v.optional(v.string()),
    sortName: v.string()
  })
    .index('by_sortName', ['sortName'])
    .index('by_className', ['className', 'sortName'])
    .index('by_status', ['status', 'sortName'])
    .index('by_academicYear', ['academicYear', 'className', 'sortName']),

  teachers: defineTable({
    fullName: v.string(),
    preferredName: v.string(),
    role: v.union(
      v.literal('Teacher'),
      v.literal('Homeroom Teacher'),
      v.literal('Teaching Assistant')
    ),
    status: v.union(v.literal('Active'), v.literal('On Leave')),
    academicYear: v.optional(v.string()),
    homeroomClass: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    sortName: v.string()
  })
    .index('by_sortName', ['sortName'])
    .index('by_academicYear', ['academicYear', 'sortName']),

  concernCases: defineTable({
    studentId: v.id('students'),
    title: v.string(),
    category: v.union(
      v.literal('Learning Support'),
      v.literal('Behaviour'),
      v.literal('Attendance'),
      v.literal('Family'),
      v.literal('Medical'),
      v.literal('Safeguarding')
    ),
    severity: v.union(
      v.literal('Low'),
      v.literal('Medium'),
      v.literal('High'),
      v.literal('Critical')
    ),
    status: v.union(
      v.literal('Open'),
      v.literal('Monitoring'),
      v.literal('Escalated'),
      v.literal('Resolved')
    ),
    visibility: v.union(v.literal('Standard'), v.literal('Restricted')),
    assignedTeacherId: v.optional(v.id('teachers')),
    summary: v.string(),
    nextReviewDate: v.optional(v.string()),
    updatedAt: v.number(),
    sortKey: v.string()
  })
    .index('by_student', ['studentId', 'updatedAt'])
    .index('by_status', ['status', 'updatedAt'])
    .index('by_severity', ['severity', 'updatedAt'])
    .index('by_assignedTeacher', ['assignedTeacherId', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  concernCaseUpdates: defineTable({
    caseId: v.id('concernCases'),
    note: v.string(),
    authorLabel: v.string(),
    createdAt: v.number()
  }).index('by_case', ['caseId', 'createdAt']),

  studentBillingProfiles: defineTable({
    studentId: v.id('students'),
    baseMonthlyFee: v.number(),
    billingStatus: v.union(
      v.literal('Current'),
      v.literal('Overdue'),
      v.literal('Scholarship'),
      v.literal('Custom')
    ),
    scholarshipType: v.optional(
      v.union(
        v.literal('Partial Scholarship'),
        v.literal('Full Scholarship'),
        v.literal('Sibling Discount'),
        v.literal('Hardship Support'),
        v.literal('Negotiated Custom')
      )
    ),
    scholarshipPercent: v.optional(v.number()),
    customMonthlyFee: v.optional(v.number()),
    arrearsBalance: v.number(),
    paymentPlan: v.optional(v.string()),
    familyLabel: v.optional(v.string()),
    collectionStage: v.optional(
      v.union(
        v.literal('No follow-up'),
        v.literal('Reminder queued'),
        v.literal('In contact'),
        v.literal('Promise to pay'),
        v.literal('Escalated')
      )
    ),
    reminderChannel: v.optional(
      v.union(
        v.literal('Email'),
        v.literal('WhatsApp'),
        v.literal('Phone'),
        v.literal('In person'),
        v.literal('Not set')
      )
    ),
    lastReminderDate: v.optional(v.string()),
    nextActionDate: v.optional(v.string()),
    billingItems: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          category: v.union(
            v.literal('Lunch Plan'),
            v.literal('Extra Lesson'),
            v.literal('Extracurricular'),
            v.literal('Transport'),
            v.literal('Other')
          ),
          billingBehavior: v.union(
            v.literal('Included'),
            v.literal('Charged'),
            v.literal('Available')
          ),
          monthlyAmount: v.number(),
          notes: v.optional(v.string()),
          sortOrder: v.number()
        })
      )
    ),
    notesSummary: v.optional(v.string()),
    updatedAt: v.number()
  })
    .index('by_student', ['studentId', 'updatedAt'])
    .index('by_status', ['billingStatus', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  financeCharges: defineTable({
    billingProfileId: v.id('studentBillingProfiles'),
    title: v.string(),
    category: v.union(
      v.literal('Tuition'),
      v.literal('Registration'),
      v.literal('Lunch Plan'),
      v.literal('Extra Lesson'),
      v.literal('Extracurricular'),
      v.literal('Transport'),
      v.literal('Other')
    ),
    amount: v.number(),
    chargeDate: v.string(),
    dueDate: v.string(),
    status: v.union(
      v.literal('Pending'),
      v.literal('Paid'),
      v.literal('Overdue'),
      v.literal('Waived')
    ),
    updatedAt: v.number()
  })
    .index('by_profile', ['billingProfileId', 'updatedAt'])
    .index('by_status', ['status', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  financePayments: defineTable({
    billingProfileId: v.id('studentBillingProfiles'),
    amount: v.number(),
    paidAt: v.string(),
    method: v.union(
      v.literal('Bank Transfer'),
      v.literal('Cash'),
      v.literal('Card'),
      v.literal('Wallet'),
      v.literal('Scholarship Credit')
    ),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number()
  })
    .index('by_profile', ['billingProfileId', 'createdAt'])
    .index('by_createdAt', ['createdAt']),

  financeReminderLogs: defineTable({
    billingProfileId: v.id('studentBillingProfiles'),
    reminderDate: v.string(),
    channel: v.union(
      v.literal('Email'),
      v.literal('WhatsApp'),
      v.literal('Phone'),
      v.literal('In person'),
      v.literal('Not set')
    ),
    collectionStage: v.union(
      v.literal('No follow-up'),
      v.literal('Reminder queued'),
      v.literal('In contact'),
      v.literal('Promise to pay'),
      v.literal('Escalated')
    ),
    outcome: v.string(),
    nextActionDate: v.optional(v.string()),
    authorLabel: v.string(),
    createdAt: v.number()
  })
    .index('by_profile', ['billingProfileId', 'createdAt'])
    .index('by_createdAt', ['createdAt']),

  admissionsEnquiries: defineTable({
    studentName: v.string(),
    familyName: v.string(),
    classInterest: v.string(),
    guardianName: v.string(),
    guardianPhone: v.string(),
    source: v.string(),
    enquiryDate: v.string(),
    stage: v.union(
      v.literal('New'),
      v.literal('Contacted'),
      v.literal('Tour Scheduled'),
      v.literal('Application in Progress'),
      v.literal('Decision Pending'),
      v.literal('Enrolled'),
      v.literal('Closed')
    ),
    status: v.union(v.literal('Active'), v.literal('Waiting'), v.literal('Won'), v.literal('Lost')),
    notesSummary: v.optional(v.string()),
    sortName: v.string(),
    convertedStudentId: v.optional(v.id('students')),
    convertedAt: v.optional(v.number()),
    updatedAt: v.number()
  })
    .index('by_sortName', ['sortName'])
    .index('by_stage', ['stage', 'updatedAt'])
    .index('by_status', ['status', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt'])
    .index('by_convertedStudent', ['convertedStudentId', 'updatedAt']),

  attendanceSessions: defineTable({
    className: v.string(),
    sessionDate: v.string(),
    status: v.union(v.literal('Draft'), v.literal('In progress'), v.literal('Completed')),
    notesSummary: v.optional(v.string()),
    sortKey: v.string(),
    updatedAt: v.number()
  })
    .index('by_sortKey', ['sortKey'])
    .index('by_classAndDate', ['className', 'sessionDate'])
    .index('by_updatedAt', ['updatedAt']),

  attendanceRecords: defineTable({
    sessionId: v.id('attendanceSessions'),
    studentId: v.id('students'),
    status: v.union(
      v.literal('Present'),
      v.literal('Late'),
      v.literal('Absent'),
      v.literal('Excused')
    ),
    note: v.optional(v.string()),
    updatedAt: v.number()
  })
    .index('by_session', ['sessionId', 'updatedAt'])
    .index('by_session_student', ['sessionId', 'studentId'])
    .index('by_student', ['studentId', 'updatedAt']),

  operationsTimeSlots: defineTable({
    label: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    blockType: v.union(
      v.literal('Arrival'),
      v.literal('Lesson'),
      v.literal('Break'),
      v.literal('Lunch'),
      v.literal('Specialist'),
      v.literal('Assembly'),
      v.literal('Dismissal')
    ),
    sortOrder: v.number(),
    isActive: v.boolean()
  })
    .index('by_sortOrder', ['sortOrder'])
    .index('by_blockType', ['blockType', 'sortOrder']),

  classTimetableEntries: defineTable({
    academicYear: v.string(),
    className: v.string(),
    weekday: v.union(
      v.literal('Monday'),
      v.literal('Tuesday'),
      v.literal('Wednesday'),
      v.literal('Thursday'),
      v.literal('Friday')
    ),
    timeSlotId: v.id('operationsTimeSlots'),
    activityTitle: v.string(),
    area: v.optional(v.string()),
    leadTeacherId: v.optional(v.id('teachers')),
    location: v.optional(v.string()),
    specialistLabel: v.optional(v.string()),
    lunchLabel: v.optional(v.string()),
    themeLabel: v.optional(v.string()),
    note: v.optional(v.string()),
    updatedAt: v.number()
  })
    .index('by_class', ['academicYear', 'className', 'updatedAt'])
    .index('by_timeSlot', ['timeSlotId', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  operationsOverrides: defineTable({
    overrideDate: v.string(),
    academicYear: v.optional(v.string()),
    className: v.optional(v.string()),
    timeSlotId: v.optional(v.id('operationsTimeSlots')),
    overrideType: v.union(
      v.literal('Cover'),
      v.literal('Medical'),
      v.literal('Lunch'),
      v.literal('Specialist'),
      v.literal('Room Change'),
      v.literal('Trip'),
      v.literal('Absence'),
      v.literal('General')
    ),
    status: v.union(v.literal('Open'), v.literal('Confirmed'), v.literal('Resolved')),
    teacherId: v.optional(v.id('teachers')),
    studentId: v.optional(v.id('students')),
    title: v.string(),
    summary: v.string(),
    updatedAt: v.number()
  })
    .index('by_date', ['overrideDate', 'updatedAt'])
    .index('by_class_date', ['className', 'overrideDate', 'updatedAt'])
    .index('by_status', ['status', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  staffLeaveRequests: defineTable({
    teacherId: v.id('teachers'),
    leaveType: v.union(
      v.literal('Annual'),
      v.literal('Sick'),
      v.literal('Emergency'),
      v.literal('Personal'),
      v.literal('Training'),
      v.literal('Unpaid'),
      v.literal('Other')
    ),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(
      v.literal('Requested'),
      v.literal('Approved'),
      v.literal('Rejected'),
      v.literal('Cancelled')
    ),
    reason: v.string(),
    notesSummary: v.optional(v.string()),
    requestedBy: v.string(),
    updatedAt: v.number()
  })
    .index('by_teacher', ['teacherId', 'updatedAt'])
    .index('by_status', ['status', 'updatedAt'])
    .index('by_startDate', ['startDate', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  staffCoverAssignments: defineTable({
    leaveRequestId: v.id('staffLeaveRequests'),
    coverDate: v.string(),
    className: v.optional(v.string()),
    timeSlotLabel: v.optional(v.string()),
    primaryTeacherId: v.id('teachers'),
    coverTeacherId: v.optional(v.id('teachers')),
    status: v.union(
      v.literal('Open'),
      v.literal('Assigned'),
      v.literal('Confirmed'),
      v.literal('Completed')
    ),
    note: v.optional(v.string()),
    updatedAt: v.number()
  })
    .index('by_leaveRequest', ['leaveRequestId', 'updatedAt'])
    .index('by_coverDate', ['coverDate', 'updatedAt'])
    .index('by_status', ['status', 'updatedAt'])
    .index('by_primaryTeacher', ['primaryTeacherId', 'updatedAt'])
    .index('by_coverTeacher', ['coverTeacherId', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt'])
});
