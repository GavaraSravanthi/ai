import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import ReactMarkdown from "react-markdown";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "./App.css";

// Ensure ONLY ONE safeJsonParse function exists and it is complete
const safeJsonParse = (value, fallback) => {
  try {
    if (!value || value === "undefined" || value === "null") {
      return fallback;
    }
    return JSON.parse(value);
  } catch (error) {
    console.error("JSON parse error:", error);
    return fallback;
  }
};


function App() {
  const [currentUser, setCurrentUser] = useState(
    safeJsonParse(localStorage.getItem("studyUser"), null)
  );
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [profileAvatar, setProfileAvatar] = useState(currentUser?.avatar || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [subjects, setSubjects] = useState("");
  const [hours, setHours] = useState("");
  const [weakSubjects, setWeakSubjects] = useState("");
  const [examDate, setExamDate] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);

  const [savedPlans, setSavedPlans] = useState([]);
  const [openPlanId, setOpenPlanId] = useState(null);

  const [completedDays, setCompletedDays] = useState([]);
  const [dynamicDays, setDynamicDays] = useState(7);

  const [streak, setStreak] = useState(
    Number(localStorage.getItem("studyStreak") || 0)
  );
  const [bestStreak, setBestStreak] = useState(
    Number(localStorage.getItem("bestStreak") || 0)
  );

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  const [quizSubject, setQuizSubject] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);

  const [notesSubject, setNotesSubject] = useState("");
  const [notesTopic, setNotesTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);

  const [flashSubject, setFlashSubject] = useState("");
  const [flashTopic, setFlashTopic] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [flashLoading, setFlashLoading] = useState(false);
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [showFlashAnswer, setShowFlashAnswer] = useState(false);

  const [interviewSubject, setInterviewSubject] = useState("");
  const [interviewLevel, setInterviewLevel] = useState("Beginner");
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [currentInterview, setCurrentInterview] = useState(0);
  const [showInterviewAnswer, setShowInterviewAnswer] = useState(false);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedExamDate, setSelectedExamDate] = useState(null);
  const [showExamCalendar, setShowExamCalendar] = useState(false);

  const [dailyGoal, setDailyGoal] = useState(
    Number(localStorage.getItem("dailyGoal") || 4)
  );
  const [weeklyGoal, setWeeklyGoal] = useState(
    Number(localStorage.getItem("weeklyGoal") || 25)
  );
  const [studiedToday, setStudiedToday] = useState(
    Number(localStorage.getItem("studiedToday") || 0)
  );
  const [studyLog, setStudyLog] = useState(
    safeJsonParse(localStorage.getItem("studyLog"), [])
  );

  const [reminderTime, setReminderTime] = useState(
    localStorage.getItem("reminderTime") || "19:00"
  );
  const [reminderSubject, setReminderSubject] = useState(
    localStorage.getItem("reminderSubject") || "Study Time"
  );

  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeAnalysis, setResumeAnalysis] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "ai",
      text: "Hi! I am your AI Study Assistant. Ask me to explain topics, create notes, prepare quizzes, or help with interview questions."
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatSessionId, setActiveChatSessionId] = useState(null);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const [aiMemory, setAiMemory] = useState([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [manualMemory, setManualMemory] = useState("");
  const [activities, setActivities] = useState(
    safeJsonParse(localStorage.getItem("studyActivities"), [])
  );

  const totalDays = dynamicDays;
  const progress = Math.round((completedDays.length / totalDays) * 100);

  const totalSavedPlans = savedPlans.length;
  const totalStudyHours = savedPlans.reduce(
    (total, item) => total + Number(item.hours || 0),
    0
  );

  const goalProgress = Math.min(Math.round((studiedToday / dailyGoal) * 100), 100);
  const weeklyStudiedHours = studyLog.reduce(
    (total, item) => total + Number(item.hours || 0),
    0
  );
  const weeklyProgress = Math.min(Math.round((weeklyStudiedHours / weeklyGoal) * 100), 100);
  const averageQuizScore = score !== null && quiz.length > 0 ? Math.round((score / quiz.length) * 100) : 0;

  const totalBadgesEarned = 0;
  const plansCreated = savedPlans.length;
  const totalQuizQuestions = quiz.length;
  const leaderboardData = [
    { rank: 1, name: currentUser?.name || "You", score: Math.max(streak * 10 + completedDays.length * 5 + averageQuizScore, 50), badge: "Active Learner" },
    { rank: 2, name: "Priya", score: 92, badge: "Quiz Champion" },
    { rank: 3, name: "Rahul", score: 84, badge: "Planner Pro" },
    { rank: 4, name: "Ananya", score: 76, badge: "Focus Hero" }
  ].sort((a, b) => b.score - a.score).map((item, index) => ({ ...item, rank: index + 1 }));

  const achievements = [
    { title: "Beginner Learner", icon: "🥉", unlocked: completedDays.length >= 1 },
    { title: "Consistent Learner", icon: "🥈", unlocked: streak >= 3 },
    { title: "Study Master", icon: "🥇", unlocked: streak >= 7 },
    { title: "Quiz Champion", icon: "🏆", unlocked: averageQuizScore >= 80 },
    { title: "Planner Pro", icon: "📚", unlocked: totalSavedPlans >= 3 },
    { title: "Focus Hero", icon: "⏱", unlocked: studiedToday >= dailyGoal }
  ];

  const weeklyReportData = studyLog.map((item, index) => ({
    name: item.date || `Day ${index + 1}`,
    hours: Number(item.hours || 0)
  }));

  const chartData = savedPlans.map((item, index) => ({
    name: `Plan ${index + 1}`,
    hours: Number(item.hours || 0),
  }));

  const pieData = [
    { name: "Completed", value: completedDays.length },
    { name: "Remaining", value: Math.max(totalDays - completedDays.length, 0) },
  ];

  const badgesEarned = achievements.filter((badge) => badge.unlocked).length;
  const learningScore = Math.round(
    averageQuizScore * 0.4 +
      streak * 5 +
      totalSavedPlans * 4 +
      badgesEarned * 12 +
      weeklyStudiedHours * 3 +
      progress * 0.1 +
      goalProgress * 0.1
  );

  const analyticsTrendData = [
    { name: "Plans", value: totalSavedPlans },
    { name: "Quiz", value: averageQuizScore },
    { name: "Streak", value: streak },
    { name: "Goals", value: goalProgress },
    { name: "Badges", value: badgesEarned },
    { name: "Score", value: learningScore },
  ];

  const scoreBreakdownData = [
    { name: "Quiz", value: Math.round(averageQuizScore * 0.4) },
    { name: "Streak", value: streak * 5 },
    { name: "Plans", value: totalSavedPlans * 4 },
    { name: "Badges", value: badgesEarned * 12 },
    { name: "Hours", value: weeklyStudiedHours * 3 },
  ];

  const parseStudyPlanDays = (planText) => {
    if (!planText) return [];

    const matches = [...planText.matchAll(/Day\s+(\d+)\s*:\s*([\s\S]*?)(?=\n\s*Day\s+\d+\s*:|$)/gi)];

    return matches.map((match) => {
      const dayNumber = match[1];
      const body = match[2].trim();

      const pick = (label) => {
        const regex = new RegExp(label + "\\s*:\s*([^\\n]+)", "i");
        const found = body.match(regex);
        return found ? found[1].trim() : "";
      };

      return {
        day: dayNumber,
        topic: pick("Topic"),
        study: pick("Study"),
        revision: pick("Revision"),
        practice: pick("Practice"),
        quickTest: pick("Quick Test"),
        raw: body,
      };
    });
  };

  const planDayCards = parseStudyPlanDays(plan);

  useEffect(() => {
    viewSavedPlans();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || "");
      setProfileAvatar(currentUser.avatar || "");
      fetchLatestProfile();
      loadChatSessions(currentUser.id);
      loadAiMemory(currentUser.id);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("studyActivities", JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    let timer;

    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    const closeMenuOnResize = () => {
      if (window.innerWidth > 950) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", closeMenuOnResize);
    return () => window.removeEventListener("resize", closeMenuOnResize);
  }, []);

  const fetchLatestProfile = async () => {
    if (!currentUser?.id) return;

    try {
      const response = await fetch(`https://ai-study-planner-rja9.onrender.com/profile/${currentUser.id}`);
      const data = await response.json();

      if (data.success && data.user) {
        localStorage.setItem("studyUser", JSON.stringify(data.user));
        setCurrentUser(data.user);
        setProfileName(data.user.name || "");
        setProfileAvatar(data.user.avatar || "");
      }
    } catch (error) {
      console.log("Profile sync failed", error);
    }
  };

  const handleProfileAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setProfileAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const updateProfile = async () => {
    if (!profileName.trim()) {
      toast.warning("Name is required");
      return;
    }

    try {
      setProfileSaving(true);
      const response = await fetch(`http://127.0.0.1:5000/profile/${currentUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: profileName,
          avatar: profileAvatar
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.message || "Profile update failed");
        return;
      }

      localStorage.setItem("studyUser", JSON.stringify(data.user));
      setCurrentUser(data.user);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Backend error. Check Flask server.");
      console.log(error);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAuth = async () => {
    if (!authEmail || !authPassword || (authMode === "register" && !authName)) {
      toast.warning("Please fill all required fields");
      return;
    }

    if (authMode === "register" && authPassword.length < 6) {
      toast.warning("Password must be at least 6 characters");
      return;
    }

    try {
      setAuthLoading(true);
      const endpoint = authMode === "login" ? "login" : "register";
      const payload =
        authMode === "login"
          ? { email: authEmail, password: authPassword }
          : { name: authName, email: authEmail, password: authPassword };

      const response = await fetch(`http://127.0.0.1:5000/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.message || "Authentication failed");
        return;
      }

      localStorage.setItem("studyUser", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setProfileName(data.user.name || "");
      setProfileAvatar(data.user.avatar || "");
      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
      setActivePage("dashboard");
      toast.success(authMode === "login" ? "Login successful" : "Registration successful");
    } catch (error) {
      toast.error("Backend error. Check Flask server.");
      console.log(error);
    } finally {
      setAuthLoading(false);
    }
  };

  const logoutUser = () => {
    localStorage.removeItem("studyUser");
    setCurrentUser(null);
    setActivePage("dashboard");
  };

  const calculateDaysFromDate = (dateValue) => {
    if (!dateValue) return 7;

    const today = new Date();
    const exam = new Date(dateValue);

    today.setHours(0, 0, 0, 0);
    exam.setHours(0, 0, 0, 0);

    const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const formatDateForInput = (date) => {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  };

  const handleExamDateChange = (value) => {
    setExamDate(value);
    setDynamicDays(calculateDaysFromDate(value));
    setCompletedDays([]);
  };

  const handleExamCalendarChange = (date) => {
    setSelectedExamDate(date);
    const formattedDate = formatDateForInput(date);
    handleExamDateChange(formattedDate);
    setShowExamCalendar(false);
  };

  const generatePlan = async () => {
    if (!subjects || !hours || !weakSubjects || !examDate) {
      toast.warning("Please fill all fields");
      return;
    }

    if (Number(hours) <= 0 || Number(hours) > 24) {
      toast.warning("Study hours must be between 1 and 24");
      return;
    }

    try {
      setLoading(true);
      setPlan("");
      setCompletedDays([]);

      const response = await fetch("http://127.0.0.1:5000/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subjects,
          hours,
          weakSubjects,
          examDate
        })
      });

      const data = await response.json();

      setPlan(data.plan);
      toast.success("Study plan generated successfully");

      if (data.daysLeft) {
        setDynamicDays(data.daysLeft);
      } else {
        setDynamicDays(calculateDaysFromDate(examDate));
      }

      setActivePage("planner");
      addActivity("🧠", `Generated study plan for ${subjects}`);
    } catch (error) {
      toast.error("Backend error. Check Flask server.");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!plan) {
      toast.warning("Generate a study plan first");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("AI Study Planner", 20, 20);

    doc.setFontSize(11);
    doc.text(`Subjects: ${subjects}`, 20, 32);
    doc.text(`Study Hours Per Day: ${hours}`, 20, 40);
    doc.text(`Weak Subjects: ${weakSubjects}`, 20, 48);
    doc.text(`Exam Date: ${examDate}`, 20, 56);
    doc.text(`Total Days: ${totalDays}`, 20, 64);

    const lines = doc.splitTextToSize(plan, 170);
    let y = 78;

    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }

      doc.text(line, 20, y);
      y += 7;
    });

    doc.save("AI_Study_Plan.pdf");
  };

  const generateNotes = async () => {
    if (!notesSubject || !notesTopic) {
      toast.warning("Please enter subject and topic");
      return;
    }

    try {
      setNotesLoading(true);
      setNotes("");

      const response = await fetch("http://127.0.0.1:5000/generate-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: notesSubject,
          topic: notesTopic
        })
      });

      const data = await response.json();
      setNotes(data.notes);
      toast.success("Notes generated successfully");
      addActivity("📚", `Generated notes: ${notesSubject} - ${notesTopic}`);
    } catch (error) {
      toast.error("Notes generation failed.");
      console.log(error);
    } finally {
      setNotesLoading(false);
    }
  };

  const downloadNotesPDF = () => {
    if (!notes) {
      toast.warning("Generate notes first");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("AI Notes Generator", 20, 20);

    doc.setFontSize(11);
    doc.text(`Subject: ${notesSubject}`, 20, 32);
    doc.text(`Topic: ${notesTopic}`, 20, 40);

    const lines = doc.splitTextToSize(notes, 170);
    let y = 55;

    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }

      doc.text(line, 20, y);
      y += 7;
    });

    doc.save("AI_Notes.pdf");
  };


  const generateFlashcards = async () => {
    if (!flashSubject || !flashTopic) {
      toast.warning("Please enter subject and topic");
      return;
    }

    try {
      setFlashLoading(true);
      setFlashcards([]);
      setCurrentFlashcard(0);
      setShowFlashAnswer(false);

      const response = await fetch("http://127.0.0.1:5000/generate-flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: flashSubject,
          topic: flashTopic
        })
      });

      const data = await response.json();
      setFlashcards(data.flashcards || []);
      toast.success("Flashcards generated successfully");
      addActivity("🧩", `Created flashcards: ${flashSubject} - ${flashTopic}`);
    } catch (error) {
      toast.error("Flashcards generation failed.");
      console.log(error);
    } finally {
      setFlashLoading(false);
    }
  };

  const nextFlashcard = () => {
    if (flashcards.length === 0) return;
    setShowFlashAnswer(false);
    setCurrentFlashcard((prev) => (prev + 1) % flashcards.length);
  };

  const previousFlashcard = () => {
    if (flashcards.length === 0) return;
    setShowFlashAnswer(false);
    setCurrentFlashcard((prev) =>
      prev === 0 ? flashcards.length - 1 : prev - 1
    );
  };

  const downloadFlashcardsPDF = () => {
    if (flashcards.length === 0) {
      toast.warning("Generate flashcards first");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("AI Flashcards", 20, 20);

    doc.setFontSize(11);
    doc.text(`Subject: ${flashSubject}`, 20, 32);
    doc.text(`Topic: ${flashTopic}`, 20, 40);

    let y = 55;

    flashcards.forEach((card, index) => {
      const content = `${index + 1}. Q: ${card.question}\nA: ${card.answer}`;
      const lines = doc.splitTextToSize(content, 170);

      lines.forEach((line) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }

        doc.text(line, 20, y);
        y += 7;
      });

      y += 5;
    });

    doc.save("AI_Flashcards.pdf");
  };

  const generateInterviewQuestions = async () => {
    if (!interviewSubject) {
      toast.warning("Please enter interview subject");
      return;
    }

    try {
      setInterviewLoading(true);
      setInterviewQuestions([]);
      setCurrentInterview(0);
      setShowInterviewAnswer(false);

      const response = await fetch("http://127.0.0.1:5000/generate-interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: interviewSubject,
          level: interviewLevel
        })
      });

      const data = await response.json();
      setInterviewQuestions(data.interview || []);
      toast.success("Interview questions generated successfully");
      addActivity("🎤", `Generated interview prep for ${interviewSubject}`);
    } catch (error) {
      toast.error("Interview questions generation failed.");
      console.log(error);
    } finally {
      setInterviewLoading(false);
    }
  };

  const nextInterviewQuestion = () => {
    if (interviewQuestions.length === 0) return;
    setShowInterviewAnswer(false);
    setCurrentInterview((prev) => (prev + 1) % interviewQuestions.length);
  };

  const previousInterviewQuestion = () => {
    if (interviewQuestions.length === 0) return;
    setShowInterviewAnswer(false);
    setCurrentInterview((prev) =>
      prev === 0 ? interviewQuestions.length - 1 : prev - 1
    );
  };

  const downloadInterviewPDF = () => {
    if (interviewQuestions.length === 0) {
      toast.warning("Generate interview questions first");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("AI Interview Preparation", 20, 20);

    doc.setFontSize(11);
    doc.text(`Subject: ${interviewSubject}`, 20, 32);
    doc.text(`Level: ${interviewLevel}`, 20, 40);

    let y = 55;

    interviewQuestions.forEach((item, index) => {
      const content = `${index + 1}. Q: ${item.question}\nAnswer: ${item.answer}\nTip: ${item.tip || "Revise this concept clearly."}`;
      const lines = doc.splitTextToSize(content, 170);

      lines.forEach((line) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }

        doc.text(line, 20, y);
        y += 7;
      });

      y += 5;
    });

    doc.save("AI_Interview_Preparation.pdf");
  };

  const savePlan = async () => {
    if (!plan) {
      toast.warning("Generate a plan first");
      return;
    }

    const response = await fetch("http://127.0.0.1:5000/save-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subjects,
        hours,
        weakSubjects,
        examDate,
        plan
      })
    });

    const data = await response.json();
    toast.success(data.message);
    viewSavedPlans();
    addActivity("📁", `Saved study plan for ${subjects}`);
  };

  const viewSavedPlans = async () => {
    const response = await fetch("http://127.0.0.1:5000/saved-plans");
    const data = await response.json();
    setSavedPlans(data);
  };

  const deletePlan = async (id) => {
    const confirmDelete = window.confirm("Delete this saved plan?");
    if (!confirmDelete) return;

    const response = await fetch(`http://127.0.0.1:5000/delete-plan/${id}`, {
      method: "DELETE"
    });

    const data = await response.json();
    toast.success(data.message);
    viewSavedPlans();
  };

  const toggleDay = (day) => {
    let updatedDays;

    if (completedDays.includes(day)) {
      updatedDays = completedDays.filter((d) => d !== day);
    } else {
      updatedDays = [...completedDays, day];

      const newStreak = streak + 1;
      const newBest = Math.max(bestStreak, newStreak);

      setStreak(newStreak);
      setBestStreak(newBest);

      localStorage.setItem("studyStreak", newStreak);
      localStorage.setItem("bestStreak", newBest);
    }

    setCompletedDays(updatedDays);
  };

  const resetStreak = () => {
    setStreak(0);
    localStorage.setItem("studyStreak", 0);
  };

  const saveGoalSettings = () => {
    localStorage.setItem("dailyGoal", dailyGoal);
    localStorage.setItem("weeklyGoal", weeklyGoal);
    toast.success("Goals saved successfully");
  };

  const addStudyHours = () => {
    if (studiedToday <= 0) {
      toast.warning("Enter studied hours first");
      return;
    }

    const today = new Date().toLocaleDateString();
    const existingLog = studyLog.filter((item) => item.date !== today);
    const updatedLog = [...existingLog, { date: today, hours: studiedToday }];

    setStudyLog(updatedLog);
    localStorage.setItem("studiedToday", studiedToday);
    localStorage.setItem("studyLog", JSON.stringify(updatedLog));
    toast.success("Study hours updated");
    addActivity("⏱", `Updated study hours: ${studiedToday} hour(s)`);
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Your browser does not support notifications");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      toast.success("Notifications enabled");
    } else {
      toast.warning("Notification permission denied");
    }
  };

  const saveReminder = () => {
    localStorage.setItem("reminderTime", reminderTime);
    localStorage.setItem("reminderSubject", reminderSubject);
    toast.success(`Reminder saved for ${reminderTime}`);

    if (Notification.permission === "granted") {
      new Notification("Study Reminder Saved", {
        body: `${reminderSubject} reminder set for ${reminderTime}`
      });
    }
  };

  const analyzeResume = async () => {
    if (!targetRole) {
      toast.warning("Please enter target role");
      return;
    }

    if (!resumeText && !resumeFile) {
      toast.warning("Please upload resume file or paste resume text");
      return;
    }

    try {
      setResumeLoading(true);
      setResumeAnalysis("");

      const formData = new FormData();
      formData.append("targetRole", targetRole);
      formData.append("resumeText", resumeText);

      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      const response = await fetch("http://127.0.0.1:5000/analyze-resume", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      setResumeAnalysis(data.analysis);
      toast.success("Resume analysis completed");
      addActivity("📄", `Analyzed resume for ${targetRole}`);
    } catch (error) {
      toast.error("Resume analysis failed.");
      console.log(error);
    } finally {
      setResumeLoading(false);
    }
  };

  const downloadResumePDF = () => {
    if (!resumeAnalysis) {
      toast.warning("Analyze resume first");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("AI Resume Analyzer", 20, 20);
    doc.setFontSize(11);
    doc.text(`Target Role: ${targetRole}`, 20, 34);

    const lines = doc.splitTextToSize(resumeAnalysis, 170);
    let y = 50;

    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += 7;
    });

    doc.save("AI_Resume_Analysis.pdf");
  };

  const startTimer = () => setIsRunning(true);
  const pauseTimer = () => setIsRunning(false);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const generateQuiz = async () => {
    if (!quizSubject) {
      toast.warning("Please enter quiz subject");
      return;
    }

    try {
      setQuizLoading(true);
      setQuiz([]);
      setAnswers({});
      setScore(null);

      const response = await fetch("http://127.0.0.1:5000/generate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: quizSubject
        })
      });

      const data = await response.json();
      setQuiz(data.quiz);
      toast.success("Quiz generated successfully");
    } catch (error) {
      toast.error("Quiz generation failed.");
      console.log(error);
    } finally {
      setQuizLoading(false);
    }
  };

  const selectAnswer = (questionIndex, option) => {
    setAnswers({
      ...answers,
      [questionIndex]: option
    });
  };

  const submitQuiz = () => {
    let marks = 0;

    quiz.forEach((q, index) => {
      if (answers[index] === q.answer) {
        marks++;
      }
    });

    setScore(marks);
    toast.success(`Quiz submitted: ${marks}/${quiz.length}`);
    addActivity("📝", `Completed ${quizSubject || "AI"} quiz: ${marks}/${quiz.length}`);
  };


  const loadAiMemory = async (userId = currentUser?.id) => {
    if (!userId) return;

    try {
      setMemoryLoading(true);
      const response = await fetch(`http://127.0.0.1:5000/ai-memory/${userId}`);
      const data = await response.json();

      if (data.success) {
        setAiMemory(data.memories || []);
      }
    } catch (error) {
      console.log("AI memory loading failed", error);
    } finally {
      setMemoryLoading(false);
    }
  };

  const saveManualMemory = async () => {
    if (!manualMemory.trim()) {
      toast.warning("Type something for AI to remember");
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5000/ai-memory/${currentUser.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          key: "custom memory",
          value: manualMemory
        })
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.message || "Could not save memory");
        return;
      }

      setAiMemory(data.memories || []);
      toast.success("AI memory saved");
      setManualMemory("");
      addActivity("🧠", "Saved AI memory");
    } catch (error) {
      toast.error("Unable to save memory");
      console.log(error);
    }
  };

  const clearAiMemory = async () => {
    const confirmClear = window.confirm("Clear all saved AI memory?");
    if (!confirmClear) return;

    try {
      const response = await fetch(`http://127.0.0.1:5000/ai-memory/${currentUser.id}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (data.success) {
        setAiMemory([]);
        toast.success("AI memory cleared");
        addActivity("🧹", "Cleared AI memory");
      }
    } catch (error) {
      toast.error("Unable to clear memory");
      console.log(error);
    }
  };

  const loadChatSessions = async (userId = currentUser?.id) => {
    if (!userId) return;

    try {
      setChatHistoryLoading(true);
      const response = await fetch(`http://127.0.0.1:5000/chat-sessions/${userId}`);
      const data = await response.json();

      if (data.success) {
        setChatSessions(data.sessions || []);
      }
    } catch (error) {
      console.log("Chat history loading failed", error);
    } finally {
      setChatHistoryLoading(false);
    }
  };

  const startNewChat = () => {
    setActiveChatSessionId(null);
    setChatMessages([
      {
        sender: "ai",
        text: "New chat started. Ask me anything about your studies."
      }
    ]);
    setChatInput("");
  };

  const openChatSession = async (sessionId) => {
    try {
      setChatHistoryLoading(true);
      const response = await fetch(`http://127.0.0.1:5000/chat-session/${sessionId}`);
      const data = await response.json();

      if (!data.success) {
        toast.error(data.message || "Chat not found");
        return;
      }

      const loadedMessages = (data.messages || []).map((item) => ({
        sender: item.sender,
        text: item.text,
      }));

      setActiveChatSessionId(sessionId);
      setChatMessages(
        loadedMessages.length > 0
          ? loadedMessages
          : [{ sender: "ai", text: "This chat is empty. Continue asking questions." }]
      );
    } catch (error) {
      toast.error("Unable to open chat history");
      console.log(error);
    } finally {
      setChatHistoryLoading(false);
    }
  };

  const deleteChatSession = async (sessionId) => {
    const confirmDelete = window.confirm("Delete this chat?");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`http://127.0.0.1:5000/chat-session/${sessionId}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (!data.success) {
        toast.error(data.message || "Could not delete chat");
        return;
      }

      if (activeChatSessionId === sessionId) {
        startNewChat();
      }

      toast.success("Chat deleted");
      loadChatSessions();
    } catch (error) {
      toast.error("Unable to delete chat");
      console.log(error);
    }
  };

  const addActivity = (icon, text) => {
    const newActivity = {
      id: Date.now(),
      icon,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toLocaleDateString(),
    };

    setActivities((prev) => [newActivity, ...prev].slice(0, 12));
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) {
      toast.warning("Please type your question");
      return;
    }

    const userMessage = { sender: "user", text: chatInput };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput("");

    try {
      setChatLoading(true);

      const response = await fetch("http://127.0.0.1:5000/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMessage.text,
          userName: currentUser?.name || "Student",
          userId: currentUser?.id,
          sessionId: activeChatSessionId,
        })
      });

      const data = await response.json();

      if (data.sessionId) {
        setActiveChatSessionId(data.sessionId);
      }

      setChatMessages([
        ...updatedMessages,
        { sender: "ai", text: data.reply || "I could not generate a reply right now." }
      ]);

      if (data.memories) {
        setAiMemory(data.memories);
      } else {
        loadAiMemory();
      }

      loadChatSessions();
      addActivity("🤖", `Asked AI Assistant: ${userMessage.text.slice(0, 45)}${userMessage.text.length > 45 ? "..." : ""}`);
    } catch (error) {
      console.log(error);
      setChatMessages([
        ...updatedMessages,
        { sender: "ai", text: "Backend error. Please check Flask server." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const clearChat = () => {
    startNewChat();
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "assistant", label: "AI Assistant", icon: "🤖" },
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "planner", label: "AI Planner", icon: "🧠" },
    { id: "quiz", label: "AI Quiz", icon: "📝" },
    { id: "notes", label: "AI Notes", icon: "📚" },
    { id: "flashcards", label: "Flashcards", icon: "🧩" },
    { id: "interview", label: "AI Interview", icon: "🎤" },
    { id: "goals", label: "Goals", icon: "🎯" },
    { id: "badges", label: "Badges", icon: "🏆" },
    { id: "reminders", label: "Reminders", icon: "🔔" },
    { id: "reports", label: "Weekly Reports", icon: "📈" },
    { id: "resume", label: "Resume Analyzer", icon: "📄" },
    { id: "focus", label: "Focus Timer", icon: "⏱" },
    { id: "calendar", label: "Calendar", icon: "📅" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "leaderboard", label: "Leaderboard", icon: "🏅" },
    { id: "saved", label: "Saved Plans", icon: "📁" }
  ];

  if (!currentUser) {
    return (
      <div className={darkMode ? "auth-page dark-mode" : "auth-page"}>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme={darkMode ? "dark" : "light"}
        />
        <div className="auth-card">
          <div className="auth-logo">📚</div>

          <h1>StudyAI</h1>
          <p className="auth-subtitle">
            {authMode === "login"
              ? "Login to continue your smart learning journey"
              : "Create your account and start learning smarter"}
          </p>

          {authMode === "register" && (
            <div className="auth-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
              />
            </div>
          )}

          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
          </div>

          <button onClick={handleAuth} disabled={authLoading}>
            {authLoading
              ? "Please wait..."
              : authMode === "login"
              ? "Login"
              : "Register"}
          </button>

          <p className="auth-switch">
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
            <button
              type="button"
              onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
            >
              {authMode === "login" ? "Create Account" : "Login"}
            </button>
          </p>

          <button className="auth-theme" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? "app dark-mode" : "app"}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme={darkMode ? "dark" : "light"}
      />
      <button
        className="mobile-menu-btn"
        type="button"
        onClick={() => setMobileMenuOpen(true)}
      >
        ☰
      </button>

      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      <aside className={mobileMenuOpen ? "sidebar sidebar-open" : "sidebar"}>
        <button
          className="mobile-sidebar-close"
          type="button"
          onClick={() => setMobileMenuOpen(false)}
        >
          ✕
        </button>

        <div className="brand">
          <div className="logo">📚</div>
          <div>
            <h2>StudyAI</h2>
            <p>Learning Assistant</p>
          </div>
        </div>

        <div className="side-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={activePage === item.id ? "active-menu" : ""}
              onClick={() => {
                setActivePage(item.id);
                if (item.id === "saved") viewSavedPlans();
                setMobileMenuOpen(false);
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="main">
        <section className="topbar">
          <div>
            <h1>AI Study Planner</h1>
            <p>Plan smarter. Study better. Track progress.</p>
          </div>

          <div className="top-actions">
            <button className="quick-btn" onClick={() => setActivePage("planner")}>
              + New Plan
            </button>

            <button className="user-chip" type="button">
              👤 {currentUser?.name || "User"}
            </button>

            <button className="logout-btn" onClick={logoutUser}>
              Logout
            </button>

            <button className="theme-btn" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? "☀ Light" : "🌙 Dark"}
            </button>
          </div>
        </section>

        {activePage === "dashboard" && (
          <>
            <section className="dashboard-hero-card">
              <div>
                <p className="eyebrow">Today's Learning Snapshot</p>
                <h2>Welcome back, {currentUser?.name || "Student"} 👋</h2>
                <p>Use StudyAI to plan, practice, revise, track progress, and prepare for interviews from one place.</p>
              </div>

              <div className="hero-score-box">
                <span>🏆</span>
                <h3>{learningScore}</h3>
                <p>Learning Score</p>
              </div>
            </section>

            <section className="dashboard pro-dashboard-grid">
              <div className="dashboard-card premium-card">
                <span>📁</span>
                <h3>{totalSavedPlans}</h3>
                <p>Total Plans</p>
              </div>

              <div className="dashboard-card premium-card">
                <span>✅</span>
                <h3>{completedDays.length}/{totalDays}</h3>
                <p>Completed Days</p>
              </div>

              <div className="dashboard-card premium-card progress-ring-card">
                <div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` }}>
                  <span>{progress}%</span>
                </div>
                <p>Current Progress</p>
              </div>

              <div className="dashboard-card premium-card">
                <span>🔥</span>
                <h3>{streak}</h3>
                <p>Study Streak</p>
              </div>

              <div className="dashboard-card premium-card">
                <span>🎯</span>
                <h3>{goalProgress}%</h3>
                <p>Daily Goal</p>
              </div>

              <div className="dashboard-card premium-card">
                <span>🏅</span>
                <h3>{badgesEarned}/{achievements.length}</h3>
                <p>Badges Earned</p>
              </div>

              <div className="dashboard-card premium-card">
                <span>📝</span>
                <h3>{averageQuizScore}%</h3>
                <p>Quiz Score</p>
              </div>

              <div className="dashboard-card premium-card">
                <span>⏱</span>
                <h3>{weeklyStudiedHours}</h3>
                <p>Weekly Hours</p>
              </div>
            </section>

            <section className="dashboard-insights-grid">
              <div className="insight-card">
                <h3>Weekly Activity</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={weeklyReportData.length ? weeklyReportData : [{ name: "Today", hours: studiedToday }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="hours" stroke="#4f46e5" fill="#c7d2fe" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="insight-card">
                <h3>Quick Actions</h3>
                <div className="quick-actions pro-quick-actions">
                  <button onClick={() => setActivePage("assistant")}>🤖 Ask AI Assistant</button>
                  <button onClick={() => setActivePage("planner")}>🧠 Generate Plan</button>
                  <button onClick={() => setActivePage("quiz")}>📝 Take Quiz</button>
                  <button onClick={() => setActivePage("notes")}>📚 Generate Notes</button>
                  <button onClick={() => setActivePage("flashcards")}>🧩 Flashcards</button>
                  <button onClick={() => setActivePage("analytics")}>📊 Analytics</button>
                </div>
              </div>

              <div className="insight-card activity-feed-card">
                <h3>Recent Activity</h3>
                {activities.length === 0 ? (
                  <p className="empty-activity">No activity yet. Generate a plan, quiz, notes, or ask AI Assistant.</p>
                ) : (
                  <div className="activity-feed-list">
                    {activities.slice(0, 6).map((activity) => (
                      <div className="activity-feed-item" key={activity.id}>
                        <span className="activity-icon">{activity.icon}</span>
                        <div>
                          <strong>{activity.text}</strong>
                          <p>{activity.date} • {activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}


        {activePage === "assistant" && (
          <section className="assistant-card chatgpt-assistant-card">
            <div className="assistant-header">
              <div>
                <h2>AI Chat Study Assistant</h2>
                <p>ChatGPT-style study help with saved chat history and AI memory.</p>
              </div>

              <div className="assistant-header-actions">
                <button className="new-chat-btn" onClick={startNewChat}>+ New Chat</button>
                <button className="clear-chat-btn" onClick={clearChat}>Clear</button>
              </div>
            </div>

            <div className="assistant-shell">
              <aside className="chat-history-panel">
                <div className="chat-history-title">
                  <h3>Chat History</h3>
                  <button onClick={startNewChat}>+</button>
                </div>

                {chatHistoryLoading && <p className="chat-history-empty">Loading...</p>}

                {!chatHistoryLoading && chatSessions.length === 0 && (
                  <p className="chat-history-empty">No saved chats yet.</p>
                )}

                <div className="chat-session-list">
                  {chatSessions.map((session) => (
                    <div
                      key={session.id}
                      className={
                        activeChatSessionId === session.id
                          ? "chat-session-item active-chat-session"
                          : "chat-session-item"
                      }
                    >
                      <button
                        className="chat-session-open"
                        onClick={() => openChatSession(session.id)}
                      >
                        <span>💬</span>
                        <div>
                          <strong>{session.title}</strong>
                          <small>{session.messageCount} messages • {session.updatedAt}</small>
                        </div>
                      </button>

                      <button
                        className="chat-session-delete"
                        onClick={() => deleteChatSession(session.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </aside>

              <aside className="ai-memory-panel">
                <div className="ai-memory-header">
                  <h3>AI Memory</h3>
                  <button onClick={clearAiMemory}>Clear</button>
                </div>

                <p className="ai-memory-note">StudyAI uses this memory to personalize future answers.</p>

                {memoryLoading && <p className="chat-history-empty">Loading memory...</p>}

                {!memoryLoading && aiMemory.length === 0 && (
                  <p className="chat-history-empty">No memory yet. Try: “I am preparing for DBMS” or “My weak subject is OS”.</p>
                )}

                <div className="ai-memory-list">
                  {aiMemory.map((item) => (
                    <div className="ai-memory-item" key={item.id}>
                      <strong>{item.key}</strong>
                      <p>{item.value}</p>
                      <small>{item.updatedAt}</small>
                    </div>
                  ))}
                </div>

                <div className="manual-memory-box">
                  <input
                    type="text"
                    placeholder="Tell AI what to remember..."
                    value={manualMemory}
                    onChange={(e) => setManualMemory(e.target.value)}
                  />
                  <button onClick={saveManualMemory}>Save</button>
                </div>
              </aside>

              <div className="chat-main-panel">
                <div className="chat-box chatgpt-box">
                  {chatMessages.map((msg, index) => (
                    <div
                      className={msg.sender === "user" ? "chat-message user-message" : "chat-message ai-message markdown-chat-message"}
                      key={index}
                    >
                      {msg.sender === "ai" ? (
                        <div className="markdown-message">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.text}</p>
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="chat-message ai-message">
                      <p>Thinking...</p>
                    </div>
                  )}
                </div>

                <div className="chat-input-row">
                  <input
                    type="text"
                    placeholder="Ask StudyAI anything... Example: Explain OS deadlock"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        sendChatMessage();
                      }
                    }}
                  />
                  <button onClick={sendChatMessage} disabled={chatLoading}>
                    Send
                  </button>
                </div>

                <div className="chat-suggestions">
                  <button onClick={() => setChatInput("Explain DBMS normalization with examples")}>DBMS Normalization</button>
                  <button onClick={() => setChatInput("Give chemistry important questions")}>Chem Important Questions</button>
                  <button onClick={() => setChatInput("Create Python revision notes")}>Python Notes</button>
                  <button onClick={() => setChatInput("Prepare AI interview questions")}>AI Interview</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === "profile" && (
          <section className="profile-card">
            <div className="profile-hero real-profile-hero">
              <div className="profile-avatar profile-avatar-photo">
                {profileAvatar ? (
                  <img src={profileAvatar} alt="Profile" />
                ) : (
                  (currentUser?.name || "U").charAt(0).toUpperCase()
                )}
              </div>

              <div className="profile-main-info">
                <h2>{currentUser?.name}</h2>
                <p>{currentUser?.email}</p>
                <span>Joined: {currentUser?.joinedAt || "Today"}</span>
              </div>

              <div className="profile-score-card">
                <p>Learning Score</p>
                <h3>{Math.max(streak * 10 + totalSavedPlans * 8 + averageQuizScore, 50)}</h3>
              </div>
            </div>

            <div className="profile-edit-card">
              <h3>Edit Profile</h3>

              <div className="form-grid">
                <div>
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label>Profile Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileAvatarUpload}
                  />
                </div>
              </div>

              <button onClick={updateProfile} disabled={profileSaving}>
                {profileSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>

            <div className="profile-grid">
              <div className="profile-stat">
                <span>📁</span>
                <h3>{totalSavedPlans}</h3>
                <p>Total Plans</p>
              </div>
              <div className="profile-stat">
                <span>📝</span>
                <h3>{averageQuizScore}%</h3>
                <p>Latest Quiz Score</p>
              </div>
              <div className="profile-stat">
                <span>🔥</span>
                <h3>{streak}</h3>
                <p>Study Streak</p>
              </div>
              <div className="profile-stat">
                <span>🏆</span>
                <h3>{achievements.filter((a) => a.unlocked).length}/{achievements.length}</h3>
                <p>Badges Earned</p>
              </div>
              <div className="profile-stat">
                <span>🎯</span>
                <h3>{goalProgress}%</h3>
                <p>Daily Goal</p>
              </div>
              <div className="profile-stat">
                <span>📈</span>
                <h3>{weeklyProgress}%</h3>
                <p>Weekly Goal</p>
              </div>
              <div className="profile-stat">
                <span>⏱</span>
                <h3>{weeklyStudiedHours}</h3>
                <p>Weekly Hours</p>
              </div>
              <div className="profile-stat">
                <span>✅</span>
                <h3>{completedDays.length}/{totalDays}</h3>
                <p>Plan Progress</p>
              </div>
            </div>

            <div className="profile-badges-panel">
              <h3>Badge Status</h3>
              <div className="profile-badge-list">
                {achievements.map((badge) => (
                  <div className={badge.unlocked ? "mini-badge unlocked" : "mini-badge locked"} key={badge.title}>
                    <span>{badge.icon}</span>
                    <div>
                      <strong>{badge.title}</strong>
                      <p>{badge.unlocked ? "Unlocked" : "Locked"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activePage === "planner" && (
          <>
            <section className="planner-card">
              <h2>Create AI Study Plan</h2>

              <div className="form-grid">
                <div>
                  <label>Subjects</label>
                  <input
                    type="text"
                    placeholder="DBMS, Python, AI"
                    value={subjects}
                    onChange={(e) => setSubjects(e.target.value)}
                  />
                </div>

                <div>
                  <label>Study Hours Per Day</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    placeholder="4"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  />
                </div>

                <div>
                  <label>Weak Subjects</label>
                  <input
                    type="text"
                    placeholder="Python"
                    value={weakSubjects}
                    onChange={(e) => setWeakSubjects(e.target.value)}
                  />
                </div>

                <div className="exam-date-field">
                  <label>Exam Date</label>

                  <button
                    type="button"
                    className="exam-date-button"
                    onClick={() => setShowExamCalendar(!showExamCalendar)}
                  >
                    <span>{examDate || "Select exam date"}</span>
                    <span>📅</span>
                  </button>

                  {showExamCalendar && (
                    <div className="exam-calendar-popup">
                      <Calendar
                        onChange={handleExamCalendarChange}
                        value={selectedExamDate || new Date()}
                        minDate={new Date()}
                      />
                    </div>
                  )}
                </div>
              </div>

              {examDate && (
                <p className="days-info">
                  Study plan will be generated for {totalDays} day(s).
                </p>
              )}

              <button onClick={generatePlan} disabled={loading}>
                {loading ? "Generating..." : "Generate AI Plan"}
              </button>

              {loading && <p className="loading">Generating AI Study Plan...</p>}
            </section>

            {plan && (
              <section className="result-card">
                <div className="result-header-row">
                  <div>
                    <h2>Your Study Plan</h2>
                    <p>{subjects} • {hours} hrs/day • Exam: {examDate}</p>
                  </div>
                  <span className="plan-count-badge">{totalDays} Days</span>
                </div>

                {planDayCards.length > 0 ? (
                  <div className="study-plan-card-grid">
                    {planDayCards.map((item) => (
                      <div className="study-day-card" key={item.day}>
                        <div className="study-day-top">
                          <span>Day {item.day}</span>
                          <strong>{item.topic || "Revision Topic"}</strong>
                        </div>
                        <div className="study-day-body">
                          <p><b>📖 Study:</b> {item.study || "Learn the topic clearly with examples."}</p>
                          <p><b>🔁 Revision:</b> {item.revision || "Revise important points."}</p>
                          <p><b>✍️ Practice:</b> {item.practice || "Solve practice questions."}</p>
                          <p><b>⚡ Quick Test:</b> {item.quickTest || "Write short answers."}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre>{plan}</pre>
                )}

                <div className="progress-box">
                  <h3>Study Progress</h3>

                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <p className="progress-percent">
                    Progress: {progress}% ({completedDays.length}/{totalDays})
                  </p>

                  <div className="day-grid">
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map(
                      (day) => (
                        <label className="day-check" key={day}>
                          <input
                            type="checkbox"
                            checked={completedDays.includes(day)}
                            onChange={() => toggleDay(day)}
                          />
                          Day {day}
                        </label>
                      )
                    )}
                  </div>
                </div>

                <div className="action-buttons">
                  <button onClick={savePlan}>Save Plan</button>
                  <button onClick={downloadPDF}>Download PDF</button>
                </div>
              </section>
            )}
          </>
        )}

        {activePage === "quiz" && (
          <section className="quiz-card">
            <h2>Interactive AI Quiz</h2>

            <div className="quiz-row">
              <input
                type="text"
                placeholder="Enter subject, example: Python"
                value={quizSubject}
                onChange={(e) => setQuizSubject(e.target.value)}
              />

              <button onClick={generateQuiz} disabled={quizLoading}>
                {quizLoading ? "Generating..." : "Generate Quiz"}
              </button>
            </div>

            {quizLoading && <p className="loading">Generating AI Quiz...</p>}

            {quiz.length > 0 && (
              <div className="quiz-output">
                {quiz.map((q, index) => (
                  <div className="question-card" key={index}>
                    <h3>{index + 1}. {q.question}</h3>

                    {q.options.map((option, optionIndex) => (
                      <label
                        key={optionIndex}
                        className={
                          score !== null
                            ? option === q.answer
                              ? "option correct"
                              : answers[index] === option
                              ? "option wrong"
                              : "option"
                            : "option"
                        }
                      >
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={option}
                          checked={answers[index] === option}
                          onChange={() => selectAnswer(index, option)}
                          disabled={score !== null}
                        />
                        {option}
                      </label>
                    ))}

                    {score !== null && (
                      <p className="answer-text">Correct Answer: {q.answer}</p>
                    )}
                  </div>
                ))}

                {score === null ? (
                  <button onClick={submitQuiz}>Submit Quiz</button>
                ) : (
                  <div className="score-box">
                    Score: {score}/{quiz.length}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {activePage === "notes" && (
          <section className="notes-card">
            <h2>AI Notes Generator</h2>

            <div className="form-grid">
              <div>
                <label>Subject</label>
                <input
                  type="text"
                  placeholder="Example: DBMS"
                  value={notesSubject}
                  onChange={(e) => setNotesSubject(e.target.value)}
                />
              </div>

              <div>
                <label>Topic</label>
                <input
                  type="text"
                  placeholder="Example: Normalization"
                  value={notesTopic}
                  onChange={(e) => setNotesTopic(e.target.value)}
                />
              </div>
            </div>

            <button onClick={generateNotes} disabled={notesLoading}>
              {notesLoading ? "Generating..." : "Generate Notes"}
            </button>

            {notesLoading && <p className="loading">Generating AI Notes...</p>}

            {notes && (
              <div className="notes-output">
                <h3>Your Notes</h3>
                <pre>{notes}</pre>

                <button onClick={downloadNotesPDF}>
                  Download Notes PDF
                </button>
              </div>
            )}
          </section>
        )}

        {activePage === "flashcards" && (
          <section className="flashcards-card">
            <h2>AI Flashcards</h2>

            <div className="form-grid">
              <div>
                <label>Subject</label>
                <input
                  type="text"
                  placeholder="Example: Operating Systems"
                  value={flashSubject}
                  onChange={(e) => setFlashSubject(e.target.value)}
                />
              </div>

              <div>
                <label>Topic</label>
                <input
                  type="text"
                  placeholder="Example: Deadlocks"
                  value={flashTopic}
                  onChange={(e) => setFlashTopic(e.target.value)}
                />
              </div>
            </div>

            <button onClick={generateFlashcards} disabled={flashLoading}>
              {flashLoading ? "Generating..." : "Generate Flashcards"}
            </button>

            {flashLoading && (
              <p className="loading">Generating AI Flashcards...</p>
            )}

            {flashcards.length > 0 && (
              <div className="flashcards-output">
                <p className="flashcard-counter">
                  Card {currentFlashcard + 1} of {flashcards.length}
                </p>

                <div
                  className="flashcard-box"
                  onClick={() => setShowFlashAnswer(!showFlashAnswer)}
                >
                  <p className="flashcard-label">
                    {showFlashAnswer ? "Answer" : "Question"}
                  </p>

                  <h3>
                    {showFlashAnswer
                      ? flashcards[currentFlashcard].answer
                      : flashcards[currentFlashcard].question}
                  </h3>

                  <span>Click card to flip</span>
                </div>

                <div className="flashcard-actions">
                  <button onClick={previousFlashcard}>Previous</button>
                  <button onClick={() => setShowFlashAnswer(!showFlashAnswer)}>
                    Flip
                  </button>
                  <button onClick={nextFlashcard}>Next</button>
                </div>

                <button onClick={downloadFlashcardsPDF}>
                  Download Flashcards PDF
                </button>
              </div>
            )}
          </section>
        )}

        {activePage === "interview" && (
          <section className="interview-card">
            <h2>AI Interview Preparation</h2>

            <div className="form-grid">
              <div>
                <label>Subject / Skill</label>
                <input
                  type="text"
                  placeholder="Example: Python, DBMS, AI"
                  value={interviewSubject}
                  onChange={(e) => setInterviewSubject(e.target.value)}
                />
              </div>

              <div>
                <label>Level</label>
                <select
                  value={interviewLevel}
                  onChange={(e) => setInterviewLevel(e.target.value)}
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
            </div>

            <button onClick={generateInterviewQuestions} disabled={interviewLoading}>
              {interviewLoading ? "Generating..." : "Generate Interview Questions"}
            </button>

            {interviewLoading && (
              <p className="loading">Generating AI Interview Questions...</p>
            )}

            {interviewQuestions.length > 0 && (
              <div className="interview-output">
                <p className="interview-counter">
                  Question {currentInterview + 1} of {interviewQuestions.length}
                </p>

                <div className="interview-question-card">
                  <p className="interview-label">Question</p>
                  <h3>{interviewQuestions[currentInterview].question}</h3>

                  {showInterviewAnswer && (
                    <div className="interview-answer-box">
                      <p className="interview-label">Answer</p>
                      <p>{interviewQuestions[currentInterview].answer}</p>

                      {interviewQuestions[currentInterview].tip && (
                        <p className="interview-tip">
                          💡 Tip: {interviewQuestions[currentInterview].tip}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="interview-actions">
                  <button onClick={previousInterviewQuestion}>Previous</button>
                  <button onClick={() => setShowInterviewAnswer(!showInterviewAnswer)}>
                    {showInterviewAnswer ? "Hide Answer" : "Show Answer"}
                  </button>
                  <button onClick={nextInterviewQuestion}>Next</button>
                </div>

                <button onClick={downloadInterviewPDF}>
                  Download Interview PDF
                </button>
              </div>
            )}
          </section>
        )}

        {activePage === "goals" && (
          <section className="goal-card">
            <h2>Goal Tracker</h2>

            <div className="form-grid">
              <div>
                <label>Daily Study Goal (hours)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(Number(e.target.value))}
                />
              </div>

              <div>
                <label>Weekly Study Goal (hours)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={weeklyGoal}
                  onChange={(e) => setWeeklyGoal(Number(e.target.value))}
                />
              </div>

              <div>
                <label>Hours Studied Today</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={studiedToday}
                  onChange={(e) => setStudiedToday(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="goal-progress-box">
              <h3>Daily Goal Progress: {goalProgress}%</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${goalProgress}%` }}></div>
              </div>

              <h3>Weekly Goal Progress: {weeklyProgress}%</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${weeklyProgress}%` }}></div>
              </div>
            </div>

            <div className="action-buttons">
              <button onClick={saveGoalSettings}>Save Goals</button>
              <button onClick={addStudyHours}>Update Study Hours</button>
            </div>
          </section>
        )}

        {activePage === "badges" && (
          <section className="badges-card">
            <h2>Achievements & Badges</h2>

            <div className="badges-grid">
              {achievements.map((badge, index) => (
                <div className={badge.unlocked ? "badge-card unlocked" : "badge-card locked"} key={index}>
                  <span>{badge.icon}</span>
                  <h3>{badge.title}</h3>
                  <p>{badge.unlocked ? "Unlocked" : "Locked"}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === "reminders" && (
          <section className="reminder-card">
            <h2>Study Reminders</h2>

            <div className="form-grid">
              <div>
                <label>Reminder Subject</label>
                <input
                  type="text"
                  placeholder="Example: Study Python"
                  value={reminderSubject}
                  onChange={(e) => setReminderSubject(e.target.value)}
                />
              </div>

              <div>
                <label>Reminder Time</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
              </div>
            </div>

            <div className="action-buttons">
              <button onClick={requestNotificationPermission}>Enable Notifications</button>
              <button onClick={saveReminder}>Save Reminder</button>
            </div>

            <p className="reminder-info">
              Reminder saved for: {reminderSubject} at {reminderTime}
            </p>
          </section>
        )}

        {activePage === "reports" && (
          <section className="report-card">
            <h2>Weekly Study Reports</h2>

            <div className="report-grid">
              <div className="report-box">
                <h3>{weeklyStudiedHours}</h3>
                <p>Hours Studied This Week</p>
              </div>

              <div className="report-box">
                <h3>{weeklyGoal}</h3>
                <p>Weekly Goal</p>
              </div>

              <div className="report-box">
                <h3>{weeklyProgress}%</h3>
                <p>Goal Completion</p>
              </div>

              <div className="report-box">
                <h3>{averageQuizScore}%</h3>
                <p>Latest Quiz Score</p>
              </div>
            </div>

            <div className="chart-card report-chart">
              <h3>Weekly Hours Chart</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyReportData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {activePage === "resume" && (
          <section className="resume-card">
            <h2>AI Resume Analyzer</h2>

            <div className="form-grid">
              <div>
                <label>Target Role</label>
                <input
                  type="text"
                  placeholder="Example: Python Developer"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>
            </div>

            <div className="upload-box">
              <label>Upload Resume</label>
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files[0])}
              />
              {resumeFile && <p className="file-name">📄 {resumeFile.name}</p>}
            </div>

            <div className="or-divider">OR</div>

            <label>Paste Resume Text</label>
            <textarea
              rows="10"
              placeholder="Paste your resume content here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            ></textarea>

            <button onClick={analyzeResume} disabled={resumeLoading}>
              {resumeLoading ? "Analyzing..." : "Analyze Resume"}
            </button>

            {resumeLoading && <p className="loading">Analyzing Resume...</p>}

            {resumeAnalysis && (
              <div className="resume-output">
                <h3>Resume Analysis</h3>
                <pre>{resumeAnalysis}</pre>
                <button onClick={downloadResumePDF}>Download Resume Report PDF</button>
              </div>
            )}
          </section>
        )}

        {activePage === "focus" && (
          <section className="focus-card">
            <h2>Pomodoro Focus Timer</h2>

            <div className="timer-display">{formatTime(timeLeft)}</div>

            <div className="timer-buttons">
              <button onClick={startTimer}>Start</button>
              <button onClick={pauseTimer}>Pause</button>
              <button onClick={resetTimer}>Reset</button>
            </div>

            <p className="focus-note">
              Study for 25 minutes, then take a 5-minute break.
            </p>
          </section>
        )}

        {activePage === "calendar" && (
          <section className="calendar-card">
            <h2>Study Calendar</h2>

            <Calendar
              onChange={setCalendarDate}
              value={calendarDate}
              className="study-calendar"
            />

            <p className="calendar-info">
              Selected Date: {calendarDate.toDateString()}
            </p>
          </section>
        )}

        {activePage === "analytics" && (
          <section className="analytics-card pro-analytics-card">
            <div className="analytics-title-row">
              <div>
                <h2>Real Analytics Dashboard</h2>
                <p>Live insights from your plans, quiz score, goals, streak, badges, and weekly study hours.</p>
              </div>
              <div className="analytics-score-pill">
                <span>Learning Score</span>
                <strong>{learningScore}</strong>
              </div>
            </div>

            <div className="report-grid analytics-kpi-grid">
              <div className="report-box">
                <h3>{weeklyStudiedHours}</h3>
                <p>Hours This Week</p>
              </div>
              <div className="report-box">
                <h3>{plansCreated}</h3>
                <p>Plans Created</p>
              </div>
              <div className="report-box">
                <h3>{averageQuizScore}%</h3>
                <p>Quiz Accuracy</p>
              </div>
              <div className="report-box">
                <h3>{goalProgress}%</h3>
                <p>Daily Goal</p>
              </div>
              <div className="report-box">
                <h3>{badgesEarned}</h3>
                <p>Badges Earned</p>
              </div>
              <div className="report-box">
                <h3>{progress}%</h3>
                <p>Plan Progress</p>
              </div>
            </div>

            <div className="streak-box pro-streak-box">
              <div>
                <h3>🔥 Current Streak</h3>
                <p>{streak} days</p>
              </div>

              <div>
                <h3>🏆 Best Streak</h3>
                <p>{bestStreak} days</p>
              </div>

              <button onClick={resetStreak}>Reset Streak</button>
            </div>

            <div className="charts-grid pro-charts-grid">
              <div className="chart-card wide-chart">
                <h3>Study Hours Trend</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={weeklyReportData.length ? weeklyReportData : [{ name: "Today", hours: studiedToday }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="hours" stroke="#4f46e5" fill="#c7d2fe" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Learning Score Breakdown</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={scoreBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4f46e5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Plan Study Hours</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData.length ? chartData : [{ name: "No Plan", hours: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Overall Activity</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={analyticsTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Completion Rate</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={95} label>
                      <Cell fill="#22c55e" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Goal Completion</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Completed", value: goalProgress },
                        { name: "Remaining", value: Math.max(100 - goalProgress, 0) }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={95}
                      label
                    >
                      <Cell fill="#4f46e5" />
                      <Cell fill="#c7d2fe" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {activePage === "leaderboard" && (
          <section className="leaderboard-card">
            <h2>Leaderboard</h2>
            <p className="leaderboard-subtitle">Rank is based on streak, progress, quiz score, and activity.</p>

            <div className="leaderboard-list">
              {leaderboardData.map((item) => (
                <div className={item.name === (currentUser?.name || "You") ? "leaderboard-row active-user-row" : "leaderboard-row"} key={item.rank}>
                  <div className="leaderboard-rank">#{item.rank}</div>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.badge}</p>
                  </div>
                  <div className="leaderboard-score">{item.score}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === "saved" && (
          <section className="saved-section">
            <h2>Saved Study Plans</h2>

            {savedPlans.length === 0 && (
              <p className="empty-text">No saved plans yet.</p>
            )}

            {savedPlans.map((item) => (
              <div className="saved-card" key={item.id}>
                <div className="saved-header">
                  <h3>{item.subjects}</h3>

                  <div className="saved-buttons">
                    <button
                      className="view-btn"
                      onClick={() =>
                        setOpenPlanId(openPlanId === item.id ? null : item.id)
                      }
                    >
                      {openPlanId === item.id ? "Hide" : "View"}
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => deletePlan(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="saved-meta">
                  <span>⏱ {item.hours} hrs/day</span>
                  <span>⚠️ {item.weakSubjects}</span>
                  <span>📅 {item.examDate}</span>
                </div>

                {openPlanId === item.id && <pre>{item.plan}</pre>}
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;