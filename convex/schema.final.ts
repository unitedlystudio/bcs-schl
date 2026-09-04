import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  conversations: defineTable({
    schoolId: v.id('schools'),
    participantUserIds: v.optional(v.array(v.string())),
    participantEmails: v.optional(v.array(v.string())),
    name: v.string(),
    title: v.string(),
    status: v.union(v.literal('online'), v.literal('offline')),
    initials: v.string(),
    quickReplies: v.array(v.string()),
    updatedAt: v.number()
  })
    .index('by_school_updatedAt', ['schoolId', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  messages: defineTable({
    schoolId: v.id('schools'),
    conversationId: v.id('conversations'),
    sender: v.union(v.literal('user'), v.literal('contact')),
    authorUserId: v.optional(v.string()),
    authorEmail: v.optional(v.string()),
    author: v.string(),
    text: v.string(),
    timestampLabel: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          storageId: v.optional(v.id('_storage')),
          name: v.string(),
          size: v.number(),
          type: v.string()
        })
      )
    ),
    createdAt: v.number()
  })
    .index('by_school_conversation', ['schoolId', 'conversationId', 'createdAt'])
    .index('by_conversation', ['conversationId', 'createdAt']),

  inboxItems: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_createdAt', ['schoolId', 'createdAt'])
    .index('by_school_status', ['schoolId', 'status', 'createdAt'])
    .index('by_createdAt', ['createdAt'])
    .index('by_status', ['status', 'createdAt']),

  accessRecords: defineTable({
    schoolId: v.id('schools'),
    category: v.union(
      v.literal('Business Suite'),
      v.literal('Subscriptions'),
      v.literal('Social Media')
    ),
    platform: v.string(),
    fullName: v.string(),
    loginUrl: v.string(),
    username: v.string(),
    // Both fields may be absent; every write boundary enforces both-or-neither.
    secretManager: v.optional(v.string()),
    secretReference: v.optional(v.string()),
    listingUrl: v.string(),
    adminsAccess: v.string(),
    recoveryNumber: v.string(),
    status: v.union(v.literal('Needs setup'), v.literal('Partial'), v.literal('Ready')),
    sortOrder: v.number()
  })
    .index('by_school_sortOrder', ['schoolId', 'sortOrder'])
    .index('by_school_category', ['schoolId', 'category', 'sortOrder'])
    .index('by_school_status', ['schoolId', 'status', 'sortOrder'])
    .index('by_sortOrder', ['sortOrder'])
    .index('by_category', ['category', 'sortOrder'])
    .index('by_status', ['status', 'sortOrder']),

  schools: defineTable({
    key: v.string(),
    name: v.string(),
    createdAt: v.number()
  }).index('by_key', ['key']),

  appUsers: defineTable({
    schoolId: v.id('schools'),
    authUserId: v.string(),
    email: v.string(),
    normalizedEmail: v.string(),
    name: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('disabled')),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index('by_school', ['schoolId'])
    .index('by_authUserId', ['authUserId'])
    .index('by_normalizedEmail', ['normalizedEmail']),

  roles: defineTable({
    key: v.string(),
    name: v.string(),
    permissions: v.array(v.string()),
    system: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id('appUsers'))
  })
    .index('by_key', ['key'])
    .index('by_updatedAt', ['updatedAt']),

  userRoles: defineTable({
    userId: v.id('appUsers'),
    roleId: v.id('roles'),
    grantedBy: v.optional(v.id('appUsers')),
    source: v.union(v.literal('bootstrap'), v.literal('invite'), v.literal('admin')),
    createdAt: v.number()
  })
    .index('by_user', ['userId'])
    .index('by_role', ['roleId'])
    .index('by_user_role', ['userId', 'roleId']),

  invites: defineTable({
    schoolId: v.id('schools'),
    email: v.string(),
    normalizedEmail: v.string(),
    roleId: v.id('roles'),
    tokenDigest: v.string(),
    tokenVersion: v.number(),
    status: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('revoked'),
      v.literal('expired')
    ),
    expiresAt: v.number(),
    createdBy: v.id('appUsers'),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastPresentedAt: v.number(),
    claimedByUserId: v.optional(v.id('appUsers')),
    acceptedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number())
  })
    .index('by_school_createdAt', ['schoolId', 'createdAt'])
    .index('by_tokenDigest', ['tokenDigest'])
    .index('by_normalizedEmail_status', ['normalizedEmail', 'status'])
    .index('by_status_expiresAt', ['status', 'expiresAt'])
    .index('by_createdAt', ['createdAt']),

  authAuditEvents: defineTable({
    actorUserId: v.optional(v.id('appUsers')),
    subjectUserId: v.optional(v.id('appUsers')),
    event: v.string(),
    inviteId: v.optional(v.id('invites')),
    createdAt: v.number()
  }).index('by_createdAt', ['createdAt']),

  students: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_sortName', ['schoolId', 'sortName'])
    .index('by_school_className', ['schoolId', 'className', 'sortName'])
    .index('by_school_status', ['schoolId', 'status', 'sortName'])
    .index('by_school_academicYear', ['schoolId', 'academicYear', 'className', 'sortName'])
    .index('by_sortName', ['sortName'])
    .index('by_className', ['className', 'sortName'])
    .index('by_status', ['status', 'sortName'])
    .index('by_academicYear', ['academicYear', 'className', 'sortName']),

  teachers: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_sortName', ['schoolId', 'sortName'])
    .index('by_school_academicYear', ['schoolId', 'academicYear', 'sortName'])
    .index('by_sortName', ['sortName'])
    .index('by_academicYear', ['academicYear', 'sortName']),

  concernCases: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_student', ['schoolId', 'studentId', 'updatedAt'])
    .index('by_school_status', ['schoolId', 'status', 'updatedAt'])
    .index('by_school_severity', ['schoolId', 'severity', 'updatedAt'])
    .index('by_school_assignedTeacher', ['schoolId', 'assignedTeacherId', 'updatedAt'])
    .index('by_school_updatedAt', ['schoolId', 'updatedAt'])
    .index('by_student', ['studentId', 'updatedAt'])
    .index('by_status', ['status', 'updatedAt'])
    .index('by_severity', ['severity', 'updatedAt'])
    .index('by_assignedTeacher', ['assignedTeacherId', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  concernCaseUpdates: defineTable({
    schoolId: v.id('schools'),
    caseId: v.id('concernCases'),
    note: v.string(),
    authorLabel: v.string(),
    createdAt: v.number()
  })
    .index('by_school_case', ['schoolId', 'caseId', 'createdAt'])
    .index('by_case', ['caseId', 'createdAt']),

  financeFamilyAccounts: defineTable({
    schoolId: v.id('schools'),
    accountLabel: v.string(),
    primaryGuardianName: v.string(),
    primaryGuardianPhone: v.string(),
    updatedAt: v.number()
  })
    .index('by_school_label', ['schoolId', 'accountLabel', 'updatedAt'])
    .index('by_school_updatedAt', ['schoolId', 'updatedAt'])
    .index('by_label', ['accountLabel', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  studentBillingProfiles: defineTable({
    schoolId: v.id('schools'),
    studentId: v.id('students'),
    familyAccountId: v.optional(v.id('financeFamilyAccounts')),
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
    .index('by_school_student', ['schoolId', 'studentId', 'updatedAt'])
    .index('by_school_familyAccount', ['schoolId', 'familyAccountId', 'updatedAt'])
    .index('by_school_status', ['schoolId', 'billingStatus', 'updatedAt'])
    .index('by_school_updatedAt', ['schoolId', 'updatedAt'])
    .index('by_student', ['studentId', 'updatedAt'])
    .index('by_familyAccount', ['familyAccountId', 'updatedAt'])
    .index('by_status', ['billingStatus', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  financeCharges: defineTable({
    schoolId: v.id('schools'),
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
    billingCycleLabel: v.optional(v.string()),
    billingCycleKey: v.optional(v.string()),
    status: v.union(
      v.literal('Pending'),
      v.literal('Paid'),
      v.literal('Overdue'),
      v.literal('Waived')
    ),
    updatedAt: v.number()
  })
    .index('by_school_profile', ['schoolId', 'billingProfileId', 'updatedAt'])
    .index('by_school_status', ['schoolId', 'status', 'updatedAt'])
    .index('by_school_updatedAt', ['schoolId', 'updatedAt'])
    .index('by_profile', ['billingProfileId', 'updatedAt'])
    .index('by_status', ['status', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  financePayments: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_profile', ['schoolId', 'billingProfileId', 'createdAt'])
    .index('by_school_createdAt', ['schoolId', 'createdAt'])
    .index('by_profile', ['billingProfileId', 'createdAt'])
    .index('by_createdAt', ['createdAt']),

  financeReminderLogs: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_profile', ['schoolId', 'billingProfileId', 'createdAt'])
    .index('by_school_createdAt', ['schoolId', 'createdAt'])
    .index('by_profile', ['billingProfileId', 'createdAt'])
    .index('by_createdAt', ['createdAt']),

  financePaymentApplications: defineTable({
    schoolId: v.id('schools'),
    billingProfileId: v.id('studentBillingProfiles'),
    paymentId: v.id('financePayments'),
    chargeId: v.id('financeCharges'),
    amount: v.number(),
    appliedAt: v.number()
  })
    .index('by_school_profile', ['schoolId', 'billingProfileId', 'appliedAt'])
    .index('by_school_payment', ['schoolId', 'paymentId', 'appliedAt'])
    .index('by_school_charge', ['schoolId', 'chargeId', 'appliedAt'])
    .index('by_school_appliedAt', ['schoolId', 'appliedAt'])
    .index('by_profile', ['billingProfileId', 'appliedAt'])
    .index('by_payment', ['paymentId', 'appliedAt'])
    .index('by_charge', ['chargeId', 'appliedAt'])
    .index('by_appliedAt', ['appliedAt']),

  admissionsEnquiries: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_sortName', ['schoolId', 'sortName'])
    .index('by_school_stage', ['schoolId', 'stage', 'updatedAt'])
    .index('by_school_status', ['schoolId', 'status', 'updatedAt'])
    .index('by_school_updatedAt', ['schoolId', 'updatedAt'])
    .index('by_school_convertedStudent', ['schoolId', 'convertedStudentId', 'updatedAt'])
    .index('by_sortName', ['sortName'])
    .index('by_stage', ['stage', 'updatedAt'])
    .index('by_status', ['status', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt'])
    .index('by_convertedStudent', ['convertedStudentId', 'updatedAt']),

  attendanceSessions: defineTable({
    schoolId: v.id('schools'),
    className: v.string(),
    sessionDate: v.string(),
    status: v.union(v.literal('Draft'), v.literal('In progress'), v.literal('Completed')),
    notesSummary: v.optional(v.string()),
    sortKey: v.string(),
    updatedAt: v.number()
  })
    .index('by_school_sortKey', ['schoolId', 'sortKey'])
    .index('by_school_classAndDate', ['schoolId', 'className', 'sessionDate'])
    .index('by_school_updatedAt', ['schoolId', 'updatedAt'])
    .index('by_sortKey', ['sortKey'])
    .index('by_classAndDate', ['className', 'sessionDate'])
    .index('by_updatedAt', ['updatedAt']),

  attendanceRecords: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_session', ['schoolId', 'sessionId', 'updatedAt'])
    .index('by_school_session_student', ['schoolId', 'sessionId', 'studentId'])
    .index('by_school_student', ['schoolId', 'studentId', 'updatedAt'])
    .index('by_session', ['sessionId', 'updatedAt'])
    .index('by_session_student', ['sessionId', 'studentId'])
    .index('by_student', ['studentId', 'updatedAt']),

  operationsTimeSlots: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_sortOrder', ['schoolId', 'sortOrder'])
    .index('by_school_blockType', ['schoolId', 'blockType', 'sortOrder'])
    .index('by_sortOrder', ['sortOrder'])
    .index('by_blockType', ['blockType', 'sortOrder']),

  classTimetableEntries: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_class', ['schoolId', 'academicYear', 'className', 'updatedAt'])
    .index('by_school_timeSlot', ['schoolId', 'timeSlotId', 'updatedAt'])
    .index('by_school_updatedAt', ['schoolId', 'updatedAt'])
    .index('by_class', ['academicYear', 'className', 'updatedAt'])
    .index('by_timeSlot', ['timeSlotId', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  operationsOverrides: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_date', ['schoolId', 'overrideDate', 'updatedAt'])
    .index('by_school_class_date', ['schoolId', 'className', 'overrideDate', 'updatedAt'])
    .index('by_school_status', ['schoolId', 'status', 'updatedAt'])
    .index('by_school_updatedAt', ['schoolId', 'updatedAt'])
    .index('by_date', ['overrideDate', 'updatedAt'])
    .index('by_class_date', ['className', 'overrideDate', 'updatedAt'])
    .index('by_status', ['status', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  staffLeaveRequests: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_teacher', ['schoolId', 'teacherId', 'updatedAt'])
    .index('by_school_status', ['schoolId', 'status', 'updatedAt'])
    .index('by_school_startDate', ['schoolId', 'startDate', 'updatedAt'])
    .index('by_school_updatedAt', ['schoolId', 'updatedAt'])
    .index('by_teacher', ['teacherId', 'updatedAt'])
    .index('by_status', ['status', 'updatedAt'])
    .index('by_startDate', ['startDate', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt']),

  staffCoverAssignments: defineTable({
    schoolId: v.id('schools'),
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
    .index('by_school_leaveRequest', ['schoolId', 'leaveRequestId', 'updatedAt'])
    .index('by_school_coverDate', ['schoolId', 'coverDate', 'updatedAt'])
    .index('by_school_status', ['schoolId', 'status', 'updatedAt'])
    .index('by_school_primaryTeacher', ['schoolId', 'primaryTeacherId', 'updatedAt'])
    .index('by_school_coverTeacher', ['schoolId', 'coverTeacherId', 'updatedAt'])
    .index('by_school_updatedAt', ['schoolId', 'updatedAt'])
    .index('by_leaveRequest', ['leaveRequestId', 'updatedAt'])
    .index('by_coverDate', ['coverDate', 'updatedAt'])
    .index('by_status', ['status', 'updatedAt'])
    .index('by_primaryTeacher', ['primaryTeacherId', 'updatedAt'])
    .index('by_coverTeacher', ['coverTeacherId', 'updatedAt'])
    .index('by_updatedAt', ['updatedAt'])
});
