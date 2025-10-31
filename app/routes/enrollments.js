const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const connectToDatabase = require("../db");

// GET all enrollments (admin)
router.get("/", async (req, res) => {
  try {
    const { enrollmentsDatabase } = await connectToDatabase();
    const result = await enrollmentsDatabase.find().toArray();
    res.json(result);
  } catch (err) {
    console.error("Get enrollments error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET enrollments by user email with course details
router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { enrollmentsDatabase, coursesDatabase } = await connectToDatabase();

    const enrollments = await enrollmentsDatabase
      .find({ userEmail: email })
      .toArray();

    // Enrich enrollments with full course data for dashboard display
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await coursesDatabase.findOne({
          _id: new ObjectId(enrollment.courseId),
        });

        return {
          ...enrollment,
          courseDetails: course || null,
        };
      })
    );

    res.json(enrichedEnrollments);
  } catch (err) {
    console.error("Get user enrollments error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST new enrollment (for both free and paid courses)
router.post("/", async (req, res) => {
  try {
    const { enrollmentsDatabase, coursesDatabase } = await connectToDatabase();
    const enrollmentData = req.body;

    // Validation
    if (!enrollmentData.userEmail || !enrollmentData.courseId) {
      return res.status(400).json({ error: "Missing required enrollment fields" });
    }

    // Check for existing enrollment
    const existingEnrollment = await enrollmentsDatabase.findOne({
      userEmail: enrollmentData.userEmail,
      courseId: enrollmentData.courseId,
    });

    if (existingEnrollment) {
      return res.status(400).json({ error: "You are already enrolled in this course!" });
    }

    // Get course details
    const course = await coursesDatabase.findOne({
      _id: new ObjectId(enrollmentData.courseId),
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found!" });
    }

    // For paid courses, validate payment
    if (!course.isFree) {
      if (!enrollmentData.paymentIntentId || enrollmentData.paymentStatus !== "succeeded") {
        return res.status(400).json({ error: "Payment required for this course!" });
      }
    }

    // Process curriculum for progress tracking
    const allLessons = processCurriculumForTracking(course.curriculum);

    // Create enrollment record
    const result = await enrollmentsDatabase.insertOne({
      // User information
      userId: enrollmentData.userId,
      userEmail: enrollmentData.userEmail,
      userName: enrollmentData.userName,

      // Course information
      courseId: enrollmentData.courseId,
      courseTitle: course.name,
      courseDescription: course.shortDes,
      courseImage: course.image,
      instructorName: course.teacher.name,
      coursePrice: course.price,
      isFree: course.isFree || false,

      // Curriculum and progress tracking
      curriculum: course.curriculum,
      allLessons: allLessons,
      progress: 0,
      completedLessons: [],
      currentLesson: allLessons.length > 0 ? allLessons[0].lessonId : null,
      currentDay: 1,
      status: "active",

      // Payment information (for paid courses)
      ...(!course.isFree && {
        paymentIntentId: enrollmentData.paymentIntentId,
        paymentStatus: enrollmentData.paymentStatus,
        paymentAmount: enrollmentData.paymentAmount,
        paymentCurrency: enrollmentData.paymentCurrency,
      }),

      // Metadata
      enrolledAt: new Date(),
      lastAccessedAt: new Date(),
      completedAt: null,
    });

    // Update course enrollment count
    await coursesDatabase.updateOne(
      { _id: new ObjectId(enrollmentData.courseId) },
      { $inc: { studentsEnrolled: 1 } }
    );

    res.status(201).json({
      _id: result.insertedId,
      message: "Successfully enrolled in the course!",
      enrollment: {
        ...enrollmentData,
        enrolledAt: new Date(),
        courseDetails: course,
      },
    });
  } catch (err) {
    console.error("Enrollment creation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE enrollment progress and mark lesson as completed
router.patch("/:enrollmentId/progress", async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { lessonId, completed, progress, currentDay } = req.body;

    const { enrollmentsDatabase } = await connectToDatabase();

    // Get current enrollment
    const enrollment = await enrollmentsDatabase.findOne({
      _id: new ObjectId(enrollmentId),
    });

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    const updateData = {
      lastAccessedAt: new Date(),
    };

    // Update current lesson
    if (lessonId) {
      updateData.currentLesson = lessonId;
    }

    // Update current day
    if (currentDay) {
      updateData.currentDay = currentDay;
    }

    // Mark lesson as completed
    if (completed && lessonId) {
      // Add to completed lessons if not already there
      const completedLessons = [...new Set([...enrollment.completedLessons, lessonId])];
      updateData.completedLessons = completedLessons;

      // Calculate overall progress
      const totalLessons = enrollment.allLessons.length;
      const progressPercentage = Math.round((completedLessons.length / totalLessons) * 100);
      updateData.progress = progressPercentage;

      // Check if course is completed
      if (progressPercentage === 100) {
        updateData.status = "completed";
        updateData.completedAt = new Date();
      }
    }

    // Manual progress update
    if (progress !== undefined) {
      updateData.progress = Math.min(100, Math.max(0, progress));
      if (progress === 100) {
        updateData.status = "completed";
        updateData.completedAt = new Date();
      }
    }

    const result = await enrollmentsDatabase.updateOne(
      { _id: new ObjectId(enrollmentId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    res.json({ 
      success: true, 
      message: "Progress updated",
      progress: updateData.progress,
      completedLessons: updateData.completedLessons || enrollment.completedLessons
    });
  } catch (err) {
    console.error("Update progress error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET specific enrollment with full course details
router.get("/:enrollmentId", async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { enrollmentsDatabase, coursesDatabase } = await connectToDatabase();

    const enrollment = await enrollmentsDatabase.findOne({
      _id: new ObjectId(enrollmentId),
    });

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    // Get full course details
    const course = await coursesDatabase.findOne({
      _id: new ObjectId(enrollment.courseId),
    });

    res.json({
      ...enrollment,
      courseDetails: course,
    });
  } catch (err) {
    console.error("Get enrollment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET course content for enrolled user (for video display)
router.get("/:enrollmentId/course-content", async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { enrollmentsDatabase, coursesDatabase } = await connectToDatabase();

    const enrollment = await enrollmentsDatabase.findOne({
      _id: new ObjectId(enrollmentId),
    });

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    // Get full course with curriculum
    const course = await coursesDatabase.findOne({
      _id: new ObjectId(enrollment.courseId),
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Structure data for video player dashboard
    const courseContent = {
      enrollmentId: enrollment._id,
      courseId: course._id,
      courseTitle: course.name,
      courseImage: course.image,
      instructor: course.teacher,
      progress: enrollment.progress,
      currentLesson: enrollment.currentLesson,
      currentDay: enrollment.currentDay,
      completedLessons: enrollment.completedLessons,
      curriculum: course.curriculum.map(day => ({
        id: day.id,
        title: day.title,
        duration: day.duration,
        lectures: day.lectures,
        lessons: day.lessons.map(lesson => ({
          lessonId: generateLessonId(day.id, lesson.title),
          title: lesson.title,
          duration: lesson.duration,
          type: lesson.type,
          isCompleted: enrollment.completedLessons.includes(generateLessonId(day.id, lesson.title)),
          isLocked: isLessonLocked(day.id, enrollment.currentDay, enrollment.completedLessons, course.curriculum)
        }))
      }))
    };

    res.json(courseContent);
  } catch (err) {
    console.error("Get course content error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// MARK lesson as completed
router.post("/:enrollmentId/complete-lesson", async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { lessonId, nextLessonId, currentDay } = req.body;

    const { enrollmentsDatabase } = await connectToDatabase();

    const enrollment = await enrollmentsDatabase.findOne({
      _id: new ObjectId(enrollmentId),
    });

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    // Add lesson to completed lessons
    const completedLessons = [...new Set([...enrollment.completedLessons, lessonId])];
    
    // Calculate progress
    const totalLessons = enrollment.allLessons.length;
    const progress = Math.round((completedLessons.length / totalLessons) * 100);

    const updateData = {
      completedLessons,
      progress,
      lastAccessedAt: new Date(),
      currentLesson: nextLessonId || enrollment.currentLesson,
    };

    // Update current day if provided
    if (currentDay) {
      updateData.currentDay = currentDay;
    }

    // Check if course is completed
    if (progress === 100) {
      updateData.status = "completed";
      updateData.completedAt = new Date();
    }

    await enrollmentsDatabase.updateOne(
      { _id: new ObjectId(enrollmentId) },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: "Lesson marked as completed",
      progress,
      completedLessons,
      nextLessonId: updateData.currentLesson
    });
  } catch (err) {
    console.error("Complete lesson error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// CHECK duplicate enrollment
router.get("/check-duplicate/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ error: "User email is required" });
    }

    const { enrollmentsDatabase } = await connectToDatabase();

    const existingEnrollment = await enrollmentsDatabase.findOne({
      userEmail: userEmail,
      courseId: courseId,
    });

    res.json({
      isEnrolled: !!existingEnrollment,
      enrollment: existingEnrollment,
    });
  } catch (err) {
    console.error("Duplicate check error:", err);
    res.status(500).json({ error: "Failed to check for duplicate enrollment" });
  }
});

// Helper function to process curriculum for tracking
function processCurriculumForTracking(curriculum) {
  const allLessons = [];
  
  curriculum.forEach(day => {
    day.lessons.forEach(lesson => {
      const lessonId = generateLessonId(day.id, lesson.title);
      allLessons.push({
        lessonId: lessonId,
        dayId: day.id,
        dayTitle: day.title,
        title: lesson.title,
        duration: lesson.duration,
        type: lesson.type,
        order: allLessons.length + 1
      });
    });
  });

  return allLessons;
}

// Helper function to generate unique lesson ID
function generateLessonId(dayId, lessonTitle) {
  return `day${dayId}_${lessonTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
}

// Helper function to check if lesson is locked
function isLessonLocked(dayId, currentDay, completedLessons, curriculum) {
  // First lesson of current day is always unlocked
  if (dayId === currentDay) return false;
  
  // Previous days are unlocked if user has started
  if (dayId < currentDay) return false;
  
  // Future days are locked
  if (dayId > currentDay) return true;
  
  return false;
}

module.exports = router;