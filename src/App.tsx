import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, 
  ChevronRight, 
  Copy,
  Github, 
  GitFork,
  Globe, 
  Linkedin, 
  Mail, 
  MessageCircle, 
  Send, 
  TwitchIcon, 
  Wallet, 
  Youtube,
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import emailjs from '@emailjs/browser';
declare global {
  interface Window {
    ethereum?: any;
    solana?: any;
  }
}

interface Message {
  text: string;
  isBot: boolean;
  delay?: number;
  component?: React.ReactNode;
}

type ProjectData = {
  logoUrl: string;
  title: string;
  updated: string;
  description: string;
  tags: string[];
  repoUrl: string | null;
  liveUrl?: string | null;
  resourceUrl?: string | null; 
  featured?: boolean;
  youtubeUrl?: string | null;
};

// For the featured projects
const featuredProjectsData = [
  {
    logoUrl: '/assets/trigslink_logo_dark.jpeg',
    title: 'Trigslink',
    updated: 'Beta released',
    description: 'Trigslink is a decentralized MCP network enabling AI agents to access onchain context without central control—no APIs, no lock-ins. Powered by $AVAX & Chainlink, it’s the onchain discovery and access layer for AI context.',
    tags: ['AI', 'MCP', 'ETHEREUM', 'SOLIDITY', 'PYTHON', 'CHAINLINK'],
    repoUrl: 'https://github.com/trigslink/backend',
    liveUrl: 'https://trigs.link', 
    youtubeUrl: 'https://youtu.be/x_i38WNCgj8?si=8ufNl8DBad4pcKPN',
  },
  {
    logoUrl: '/assets/fingen.png',
    title: 'FinGen',
    updated: 'Soon Releasing',
    description: 'FinGen is an AI-powered personal CFO that integrates real-time MCP data, Gemini LLM, and Monte Carlo analytics to autonomously optimize goal-based financial strategies.',
    tags: ['FI', 'MCP', 'PYTHON', 'FASTAPI'],
    repoUrl: null,
    liveUrl: null, 
  },
  {
    logoUrl: '/assets/senova_img.png',
    title: 'Senova AI',
    updated: 'MVP released',
    description: 'Cognitive wellness platform combating “cognitive debt” from AI overuse through empathetic guidance, crisis support, and interactive wellness tools powered by Google Gemini, browser extensions, and gamified learning.',
    tags: ['LANGCHAIN', 'PYTHON', 'FASTAPI', 'NODEJS', 'EXTENSION', "CHROME", "LLM", "GEMINI", "OPENAI"],
    repoUrl: 'https://github.com/MindMentors-AI/senova_mock',
    liveUrl: 'https://senova.in', 
    youtubeUrl: null,}
];


const learningActivitiesData = [
  {
    logoUrl: 'https://cdn.simpleicons.org/rust/ffffff',
    title: 'Learning Rust',
    updated: 'In Progress',
    description: 'From Rust foundations to Solana development, progressing into Anchor for robust on-chain programming.',
    tags: ['BUILDING', 'RUST', 'AI', 'AGENTIC FW', 'WEB3'],
    repoUrl: 'https://github.com/yourusername/rust-agentic-agent',
    liveUrl: null,
    resourceUrl: null
  },
  {
    logoUrl: '/assets/mit.png', 
    title: 'MIT - SEAL',
    updated: 'Reading',
    description: 'SEAL is a framework that trains LLMs via RL to generate self-edits and update themselves in response to new inputs.',
    tags: ['MIT', 'RESEARCH', 'LLM', "AI"],
    repoUrl: 'https://github.com/Continual-Intelligence/SEAL',
    resourceUrl: 'https://arxiv.org/pdf/2506.10943',
  },
];


const useRepoActivity = (repoUrl: string | null) => {
  const [activity, setActivity] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!repoUrl) {
        setLoading(false);
        return;
      }
      


      try {
        const urlParts = new URL(repoUrl).pathname.split('/').filter(Boolean);
        if (urlParts.length < 2) throw new Error("Invalid repo URL");
        const [owner, repo] = urlParts;

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`, {
          headers: {
            'Authorization': `token ${process.env.REACT_APP_GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        console.log("TOKEN CHECK:", process.env.REACT_APP_GITHUB_TOKEN);
        if (!response.ok) {
          await new Promise(res => setTimeout(res, 2000));
          const retryResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`, {
             headers: { 'Authorization': `token ${process.env.REACT_APP_GITHUB_TOKEN}` }
          });
          if (!retryResponse.ok) throw new Error(`GitHub API error: ${retryResponse.status}`);
          const data = await retryResponse.json();
          const weeklyCommits = data.map((week: { total: number }) => week.total);
          setActivity(weeklyCommits);
          setTotal(weeklyCommits.reduce((a:number, b:number) => a + b, 0));
        } else {
          const data = await response.json();
          const weeklyCommits = data.map((week: { total: number }) => week.total);
          setActivity(weeklyCommits);
          setTotal(weeklyCommits.reduce((a:number, b:number) => a + b, 0));
        }

      } catch (error) {
        console.error("Failed to fetch repo stats:", error);
        setActivity([]); // Set empty on error
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [repoUrl]);

  return { activity, total, loading };
};

const padData = (points: number[], paddingSize: number = 3): number[] => {
  if (points.length === 0) return [];
  const padding = Array(paddingSize).fill(0);
  return [...padding, ...points, ...padding];
};



const trimInactiveWeeks = (points: number[]): number[] => {
  if (points.length === 0) return [];
  const firstActiveIndex = points.findIndex((p: number) => p > 0);
  if (firstActiveIndex === -1) return [];
  const reversedPoints = [...points].reverse();
  const lastIndexFromEnd = reversedPoints.findIndex((p: number) => p > 0);
  if (lastIndexFromEnd === -1) return points.slice(firstActiveIndex);
  const lastActiveIndex = points.length - 1 - lastIndexFromEnd;
  return points.slice(firstActiveIndex, lastActiveIndex + 1);
};
const smoothData = (points: number[], windowSize: number = 5): number[] => {
  if (points.length === 0) return [];

  const smoothedPoints = points.map((_, index, array) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(array.length, index + Math.ceil(windowSize / 2));
    const windowSlice = array.slice(start, end);
    const sum = windowSlice.reduce((acc, val) => acc + val, 0);
    return sum / windowSlice.length;
  });

  return smoothedPoints;
};
const generateSmoothPath = (points: number[], fill: boolean = false) => {
  if (points.length < 2) return "";
  const width = 100;
  const height = 35;
  const maxVal = Math.max(...points, 1); // Avoid division by zero

  const pathData = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - (p / maxVal) * height;
    return [x, y];
  });

  const controlPoint = (current: number[], previous: number[] | undefined, next: number[] | undefined, reverse?: boolean) => {
    const p = previous || current;
    const n = next || current;
    const smoothing = 0.2;
    const o = [n[0] - p[0], n[1] - p[1]];
    const angle = Math.atan2(o[1], o[0]);
    const length = Math.sqrt(o[0] ** 2 + o[1] ** 2) * smoothing;
    const x = current[0] + Math.cos(angle + (reverse ? Math.PI : 0)) * length;
    const y = current[1] + Math.sin(angle + (reverse ? Math.PI : 0)) * length;
    return [x, y];
  };

  let path = `M ${pathData[0][0]} ${pathData[0][1]}`;
  pathData.forEach((point, i) => {
    if (i === 0) return;
    const [cpsX, cpsY] = controlPoint(pathData[i - 1], pathData[i - 2], point);
    const [cpeX, cpeY] = controlPoint(point, pathData[i - 1], pathData[i + 1], true);
    path += ` C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`;
  });
  
  if (fill) {
    path += ` L ${width} ${height + 5} L 0 ${height + 5} Z`;
  }
  return path;
};

const ProjectStats = ({ repoUrl }: { repoUrl: string | null }) => {
  const { activity, total, loading } = useRepoActivity(repoUrl);
  
  const trimmedActivity = trimInactiveWeeks(activity);
  const paddedActivity = padData(trimmedActivity);
  const smoothedActivity = smoothData(paddedActivity);
  const linePath = generateSmoothPath(smoothedActivity);
  const fillPath = generateSmoothPath(smoothedActivity, true);
  const accentColor = '#5fb564';

  return (
    <div className="flex-shrink-0 flex flex-col w-full md:w-[110px] items-start text-left md:items-end md:text-right mt-4 md:mt-0">
      <p className="text-xs text-slate-300">
        Activity: <span className="font-bold text-white">{loading ? '...' : `${total.toLocaleString()} Commits`}</span>
      </p>
      <div className="w-full h-10 mt-1 mb-2 relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">Loading...</div>
        ) : (
          <svg className="w-full h-full" viewBox="0 -5 100 45">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={fillPath} fill="url(#chartGradient)" />
            <path d={linePath} stroke={accentColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
};
const ProjectCard = ({ project, cardType }: { project: ProjectData, cardType: 'project' | 'learning' }) => {
  const featuredClass = project.featured ? `border-green-400/60 shadow-lg shadow-green-500/10` : 'border-slate-700';

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
      // The card stacks vertically on mobile (`flex-col`) and becomes horizontal on medium screens (`md:flex-row`).
      className={`bg-slate-800/40 border ${featuredClass} rounded-2xl p-5 flex flex-col md:flex-row items-start gap-5 transition-all duration-300 hover:border-green-400/60`}
    >
      <img src={project.logoUrl} alt={`${project.title} logo`} className="w-12 h-12 rounded-lg flex-shrink-0 mt-1" />
        
      <div className="flex-grow flex flex-col md:flex-row justify-between items-start gap-4 w-full">
        <div className="flex flex-col gap-1.5 w-full">
          <h4 className="font-semibold text-white text-base">{project.title}</h4>
          <p className="text-xs text-slate-400 -mt-1">{project.updated}</p>
          <p className="text-sm text-slate-300 leading-relaxed">{project.description}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {project.tags.map(tag => (
              <span key={tag} className="text-[11px] font-medium bg-slate-700/60 text-slate-300 px-2.5 py-1 rounded-full">{tag}</span>
            ))}
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            {project.youtubeUrl && (
              <a href={project.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-orange-400 bg-orange-500/10 border border-red-500/20 rounded-full hover:bg-red-500/20 transition-colors">
                <Youtube className="w-3.5 h-3.5" /> YouTube
              </a>
            )}
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-green-300 bg-green-500/10 border border-green-500/20 rounded-full hover:bg-green-500/20 transition-colors">
                <Globe className="w-3.5 h-3.5" /> Live
              </a>
            )}
            {project.repoUrl && cardType === 'project' && ( 
              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors">
                <Github className="w-3.5 h-3.5" /> Code
              </a>
            )}
            {cardType === 'learning' && project.resourceUrl && (
              <a href={project.resourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-green-300 bg-green-500/10 border border-green-500/20 rounded-full hover:bg-green-500/20 transition-colors">
                <GitFork className="w-3.5 h-3.5" />
                View Resource
              </a>
            )}
          </div>
        </div>

        {cardType === 'project' && <ProjectStats repoUrl={project.repoUrl} />}
      </div>
    </motion.div>
  );
};


// The container for all project cards
const FeaturedProjects = () => (
  <motion.div 
    className="space-y-4"
    initial="hidden"
    animate="visible"
    variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
  >
    {featuredProjectsData.map(project => (
      <ProjectCard key={project.title} project={project} cardType='project' />
    ))}
  </motion.div>
);

// The container for all learning activity cards
const LearningActivities = () => (
  <motion.div 
    className="space-y-4"
    initial="hidden"
    animate="visible"
    variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
  >
    {learningActivitiesData.map(activity => (
      <ProjectCard key={activity.title} project={activity} cardType='learning'/>
    ))}
  </motion.div>
);

// Configuration for Discord-style role tags.
const roleStyles = {
  Developer: {
    container: 'bg-slate-600/10 border-slate-500/20',
    dot: 'bg-slate-400',
    text: 'text-slate-300'
  },
  Researcher: {
    container: 'bg-slate-600/10 border-slate-500/20',
    dot: 'bg-slate-400',
    text: 'text-slate-300'
  },
  Engineer: {
    container: 'bg-slate-600/10 border-slate-500/20',
    dot: 'bg-slate-400',
    text: 'text-slate-300'
  },
};

// A component to render the roles.
const RoleTags = () => (
  <div className="flex items-center justify-center flex-wrap gap-1 mb-4">
    {Object.entries(roleStyles).map(([role, styles]) => (
      <div
        key={role}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${styles.container}`}
      >
        <div className={`w-1 h-1 rounded-full ${styles.dot}`} />
        <span className={styles.text}>{role}</span>
      </div>
    ))}
  </div>
);


const quotes = [
  
  { text: "If you don't believe me or don't get it, I don't have time to try to convince you, sorry.", author: "Satoshi Nakamoto", },
  { text: "The future of the internet will be owned by the users.", author: "Chris Dixon (a16z)", },
  { text: "Web3 gives power back to the creators and participants of the network.", author: "Naval Ravikant", },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay", },
  { text: "Instead of artificial intelligence, I think we’ll augment our intelligence.", author: "Ginni Rometty (IBM)", },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson", },
  { text: "Good programmers write code that humans can understand.", author: "Martin Fowler", },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", },
  { text: "Any sufficiently advanced technology is indistinguishable from magic.", author: "Arthur C. Clarke", },
];

const AnimatedQuotes = () => {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  useEffect(() => {
    const intervalID = setInterval(() => {
      setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length);
    }, 5000);

    return () => clearInterval(intervalID);
    }, []
  );
  return (
    <div className="text-sm text-center px-2 mt-2 h-24 flex items-center justify-center">
    <AnimatePresence mode = "wait">
      <motion.div
        key = {currentQuoteIndex}
        initial = {{ opacity: 0, y: 20 }}
        animate = {{ opacity: 1, y: 0 }}
        exit = {{ opacity: 0, y: -20 }}
        transition = {{ duration: 0.5, ease: 'easeInOut' }}
    >
      <p className = "text-slate-400 italic">
        "{quotes[currentQuoteIndex].text}"
        <br />
        <span className = "text-slate-500 not-italic text-xs">- {quotes[currentQuoteIndex].author}</span>
      </p>
      </motion.div>
      </AnimatePresence>
    </div>
  );
};

const SkillsGrid = ({ skills }: { skills: { name: string; category: string; logo: string | null; level?: string }[] }) => {
  // ... (Grouping logic and categoryOrder remain the same) ...

  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, typeof skills>);

  const categoryOrder = [ 'Programming Languages', 'APIs', 'ML', 'Agentic fw', 'Img Classifiers', 'DevOps' ];

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      {categoryOrder.map(category => {
        const skillsInCategory = groupedSkills[category];
        if (!skillsInCategory) return null;

        return (
          <motion.div key={category} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <h4 className="text-sm font-semibold text-slate-400 mb-3">{category}</h4>
            <motion.div
              className="flex flex-wrap gap-2"
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {skillsInCategory.map((skill) => (
                <motion.div
                  key={skill.name}
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                  className="relative flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors mt-3 ml-3"
                >
                  {skill.level === 'Beginner' && (
                    <div className="absolute -top-2 -left-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center border-2 border-slate-800">
                      {/* CORRECTED: Changed back to `font-logo` to use SpaceX.ttf */}
                      <span className="font-logo text-[10px] font-bold text-white">
                        B
                      </span>
                    </div>
                  )}

                  {skill.logo && (
                    <img src={skill.logo} alt={skill.name} className="w-4 h-4" />
                  )}
                  <span className="text-xs font-medium text-slate-300">{skill.name}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
const currentProjectsData = [
  {
    image: '/assets/senova_img.png',
    title: 'Senova AI',
    description: 'AI-driven platform tackling cognitive debt with empathetic, adaptive, and research-based guidance',
    techStack: [
      { name: 'GPT-4', logo: 'https://cdn.simpleicons.org/openai/ffffff' },
      { name: 'Gemini', logo: 'https://cdn.simpleicons.org/googlegemini/ffffff' },
      { name: 'Python', logo: 'https://cdn.simpleicons.org/python/ffffff' },
      { name: 'FastAPI', logo: 'https://cdn.simpleicons.org/fastapi/ffffff'  },
      { name: 'Langchain', logo: 'https://cdn.simpleicons.org/langchain/ffffff'  },
    ],
    liveUrl: 'https://senova.in',
    repoUrl: 'https://github.com/MindMentors-AI/Senova-AI'
  },
  {
    image: '/assets/thresh_img.png',
    title: '$THRESH',
    description: 'Thresh is an autonomous protocol designed to safely optimize idle on-chain treasuries for DAOs and users.',
    techStack: [
      { name: 'Ethereum', logo: 'https://cdn.simpleicons.org/ethereum/000000' },
      { name: 'Solidity', logo: 'https://cdn.simpleicons.org/solidity/ffffff' },
      { name: 'Python', logo: 'https://cdn.simpleicons.org/python/ffffff' },
    ],
    
  },
  {
    image: '/assets/senti.jpg',
    title: 'Senti',
    description: 'Thresh is an autonomous protocol designed to safely optimize idle on-chain treasuries for DAOs and users.',
    techStack: [
      { name: 'Ethereum', logo: 'https://cdn.simpleicons.org/ethereum/000000' },
      { name: 'Solidity', logo: 'https://cdn.simpleicons.org/solidity/ffffff' },
      { name: 'Python', logo: 'https://cdn.simpleicons.org/python/ffffff' },
      { name: 'Typescript', logo: 'https://cdn.simpleicons.org/typescript/ffffff' },
      { name: 'Node.js', logo: 'https://cdn.simpleicons.org/nodejs/ffffff' },
      { name: 'FastAPI', logo: 'https://cdn.simpleicons.org/fastapi/ffffff' },
    ],
    liveUrl: 'https://Senti.in',
  },
];

const CurrentProjects = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const darkLogos = ['Next.js', 'Rust', 'Ethereum'];

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % currentProjectsData.length);
    }, 6000);

    return () => clearInterval(intervalId);
  }, []);

  const project = currentProjectsData[currentIndex];

  return (
    <div className="rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm p-6 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-slate-300">Currently Building</h3>
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <div className="flex items-start gap-4">
            <img
              src={project.image}
              alt={project.title}
              className="w-16 h-16 rounded-lg object-cover border-2 border-white/10 flex-shrink-0"
            />
            <div className="flex flex-col gap-2">
              <div>
                <h4 className="font-semibold text-sm text-white">{project.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5 h-8 overflow-hidden line-clamp-2">{project.description}</p>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                {project.techStack?.map((tech) => (
                  <div key={tech.name} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                    <img
                      src={tech.logo}
                      alt={`${tech.name} logo`}
                      className={`w-3.5 h-3.5 ${
                        darkLogos.includes(tech.name) ? 'invert' : ''
                      }`}
                    />
                    <span>{tech.name}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                {project.liveUrl && (
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-xs font-medium text-green-300 bg-green-500/10 border border-green-500/20 rounded-full hover:bg-green-500/20 transition-colors">
                    View Live
                  </a>
                )}
                {project.repoUrl && (
                  <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors">
                    <Github className="w-3 h-3" />
                    Code
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};


const ProfessionalPortfolio = () => {
  const chatContainerRef = useRef<null | HTMLDivElement>(null);
  const introStarted = useRef(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isViewingImage, setIsViewingImage] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [networkHashrate, setNetworkHashrate] = useState(75);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showWalletsModal, setShowWalletsModal] = useState(false);
  const [senderEmail, setSenderEmail] = useState('');
  const [copiedAddress, setCopiedAddress] = useState('');
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const conversationFlow: Message[] = [
    { text: "Heyy! I'm Aakash, creating decentralized Agentic fw and smart solutions that power the next generation of Web3 applications. Check out my work!", isBot: true },
];
  const wallets = {
    ETH: '0xB1760acA3F02Ee240a45f70F4Bb84263F9Fb3f8e',
    SOL: '3HP25n9DRhoQYf86kh6NE2hj8dxJ2Dh8s7gz4ETje2tF',
    BTC: 'bc1qvsuseyq37c49qlr9fklc5jfltueev7rz9wf90k',
  };
  const quickOptions = [
    { id: 'skills', label: 'Technical Expertise', icon: <Activity className="w-4 h-4" /> },
    { id: 'projects', label: 'Featured Projects', icon: <Globe className="w-4 h-4" /> },
    { id: 'experience', label: 'In the Lab', icon: <ChevronRight className="w-4 h-4" /> },
    { id: 'contact', label: 'Send Me a Message', icon: <MessageCircle className="w-4 h-4" /> },
  ];
  
  const handleCopyAddress = (address: string, type: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(type);
    setTimeout(() => setCopiedAddress(''), 2000); // Reset after 2 seconds
  };
  
  // New function for the simple contact form
  // New function for the simple contact form
const handleContactSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!senderName.trim() || !senderEmail.trim() || !contactMessage.trim()) {
    alert('Please fill in all fields.');
    return;
  }
  setIsSendingMessage(true);

  const templateParams = {
    from_name: senderName,
    from_email: senderEmail,
    message: contactMessage,
  };

  // 📧 THIS IS THE EMAIL SENDING LOGIC
  emailjs.send(
    process.env.REACT_APP_EMAILJS_SERVICE_ID as string, 
    process.env.REACT_APP_EMAILJS_TEMPLATE_ID as string, 
    templateParams,
    process.env.REACT_APP_EMAILJS_PUBLIC_KEY as string    
  )
  .then(async (response) => {
    console.log('SUCCESS!', response.status, response.text);
    setIsSendingMessage(false);
    setShowContactModal(false);
    setSenderName('');
    setSenderEmail('');
    setContactMessage('');

    const botMessage: Message = { 
      text: `Thanks, ${senderName}! Your message has been sent. I'll get back to you shortly.`, 
      isBot: true 
    };
    await typeMessage(botMessage.text);
    setTypingText('');
    setIsTyping(false);
    setMessages(prev => [...prev, botMessage]);
  })
  .catch(async (err) => {
    console.error('FAILED...', err);
    alert('Sorry, there was an error sending your message. Please try again later.');
    setIsSendingMessage(false);
  });
};



  const skillsData = 
   [
    { name: 'Python', category: 'Programming Languages', logo: 'https://cdn.simpleicons.org/python/ffffff' },
    { name: 'Rust', category: 'Programming Languages', logo: 'https://cdn.simpleicons.org/rust/ffffff', level: 'Beginner' },
    { name: 'FastAPI', category: 'APIs', logo: 'https://cdn.simpleicons.org/fastapi/ffffff' },
    { name: 'Flask', category: 'APIs', logo: 'https://cdn.simpleicons.org/flask/ffffff' },
    { name: 'TensorFlow', category: 'ML', logo: 'https://cdn.simpleicons.org/tensorflow/ffffff' },
    { name: 'Pandas', category: 'ML', logo: 'https://cdn.simpleicons.org/pandas/ffffff' },
    { name: 'Numpy', category: 'ML', logo: 'https://cdn.simpleicons.org/numpy/ffffff' },
    { name: 'XGBoost', category: 'ML', logo: 'https://cdn.simpleicons.org/xgboost/ffffff' },
    { name: 'OpenCV', category: 'ML', logo: 'https://cdn.simpleicons.org/opencv/ffffff' },
    { name: 'Hugging Face', category: 'ML', logo: 'https://cdn.simpleicons.org/huggingface/ffffff' },
    { name: 'LangChain', category: 'Agentic fw', logo: 'https://cdn.simpleicons.org/langchain/ffffff' },
    { name: 'CrewAI', category: 'Agentic fw', logo: 'https://cdn.simpleicons.org/python/ffffff' },
    { name: 'OpenAI', category: 'Agentic fw', logo: 'https://cdn.simpleicons.org/openai/ffffff' },
    { name: 'HuggingFace', category: 'Agentic fw', logo: 'https://cdn.simpleicons.org/huggingface/ffffff' },
    { name: 'LlamaIndex', category: 'Agentic fw', logo: 'https://cdn.simpleicons.org/meta/ffffff' },
    { name: 'LangGraph', category: 'Agentic fw', logo: 'https://cdn.simpleicons.org/langchain/ffffff' },
    { name: 'Autogen', category: 'Agentic fw', logo: 'https://cdn.simpleicons.org/autogen/ffffff' },
    { name: 'Ollama', category: 'Agentic fw', logo: 'https://cdn.simpleicons.org/ollama/ffffff' },
    { name: 'ViT', category: 'Img Classifiers', logo: 'https://cdn.simpleicons.org/openai/ffffff' }, 
    { name: 'SAM2', category: 'Img Classifiers', logo: 'https://cdn.simpleicons.org/meta/ffffff', level: 'Beginner' },
    { name: 'YOLOv2', category: 'Img Classifiers', logo: 'https://cdn.simpleicons.org/yolo/ffffff', level: 'Beginner' },
    { name: 'Git', category: 'DevOps', logo: 'https://cdn.simpleicons.org/git/ffffff' },
    { name: 'Docker', category: 'DevOps', logo: 'https://cdn.simpleicons.org/docker/ffffff' },
    { name: 'Kubernetes', category: 'DevOps', logo: 'https://cdn.simpleicons.org/kubernetes/ffffff', level: 'Beginner'}

  ];
  





  <SkillsGrid skills = {skillsData} /> 

  const responses: Record<string, Message[]> = {
    skills: [
      { text: "Here's an overview of my technical capabilities:", isBot: true },
      { 
        text: '',
        isBot: true,
        component: <SkillsGrid skills = {skillsData} />,
        delay: 800 
      },
      
    ],
  projects: [
      { text: "Here are some of my recent projects & for my all other projects visit out my github page above", isBot: true },
      { 
        text: "", 
        isBot: true, 
        component: <FeaturedProjects />, 
        delay: 800 
      },
      { text: "Some projects are live and adding value, while others have their codebases ready and will go live soon. In the meantime, you can run them locally on your device.", isBot: true, delay: 1000 },
    ],
    experience: [
        { text: "Here's what I'm currently focused on:", isBot: true },
        { 
          text: "", 
          isBot: true, 
          component: <LearningActivities />, 
          delay: 800 
        },
        {
          text: "", 
          isBot: true,
          component: ( 
            <p className="text-sm text-slate-300">
              Have a great resource or a suggestion related to these topics? 
              <a 
                href="mailto:jaiswalraj03014@gmail.com?subject=Resource Suggestion for You"
                className="text-green-400 font-semibold hover:underline ml-1"
              >
                I'd love to hear it!
              </a>
            </p>
          ),
          delay: 1000,
        },
      ],
  };
  
  
  const typeMessage = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      setIsTyping(true);
      setTypingText('');
      let charIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (charIndex < text.length) {
          setTypingText(text.substring(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typingInterval);
          // This function's only job is to animate and resolve.
          // It no longer adds the message to the main array.
          resolve();
        }
      }, 25);
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const increment = Math.floor(Math.random() * 3) + 1;
      setNetworkHashrate(prev => prev + increment);
    }, 70000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (introStarted.current) {
      return;
    }
    introStarted.current = true;
 
    const runIntro = async () => {
      for (const message of conversationFlow) {
        if (message.delay) await sleep(message.delay);

        // 1. Await the typing animation to complete
        await typeMessage(message.text);
        
        // 2. NOW, update the state all at once
        setTypingText(''); // Clear the temporary typing text
        setIsTyping(false); // Hide the typing bubble
        setMessages(prev => [...prev, message]); // Add the permanent message
      }
    };
    runIntro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // The empty array [] is crucial - it tells React to only run this on mount

  // Update your scrolling useEffect to look like this:
  useEffect(() => {
    // The timeout ensures this runs after the DOM has been updated with the new message
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 0); // A 0ms delay is all that's needed
  }, [messages, typingText]);
  
  
  
  const handleOptionClick = async (optionId: string) => {
    if (isTyping || selectedOption) return;

    // This handles the special case for the contact button
    if (optionId === 'contact') {
      setShowContactModal(true);
      return;
    }

    // This adds the user's click as a message in the chat
    const userMessage: Message = { 
      text: quickOptions.find(o => o.id === optionId)?.label || '', 
      isBot: false 
    };
    setMessages(prev => [...prev, userMessage]);
    setSelectedOption(optionId);
    await sleep(400);

    if (optionId == 'skills'){
      await typeMessage ('$ pip install - requirements.txt\n\nFetching technical skills..');
      await sleep(2000);
      const botResponses = responses[optionId];
      for (const response of botResponses) {
        if (response.delay) await sleep(response.delay);

        if (response.component) {
          // Hide the loader bubble before showing the component
          setIsTyping(false);
          setTypingText('');
          setMessages(prev => [...prev, response]);
        } else if (response.text) {
          // The typeMessage function will automatically replace the loader text
          await typeMessage(response.text);
          setTypingText('');
          setIsTyping(false);
          setMessages(prev => [...prev, response]);
        }
      }
    }
    else
    {
      const botResponses = responses[optionId];
      for (const response of botResponses) {
        if (response.delay) await sleep(response.delay);
        if (response.component) {
          setMessages(prev => [...prev, response]);
        } else if (response.text) {
          await typeMessage(response.text);
          setTypingText('');
          setIsTyping(false);
          setMessages(prev => [...prev, response]);
        }
      }
    }
    setSelectedOption(null);
  };

  
  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-white overflow-hidden">
      <div 
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(95,182,100,0.25) 0%, rgba(10,10,10,0.95) 70%)`,
        }}
      />

      {/* ✅ NEW: Wallets Modal */}
{showWalletsModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
    <div className="max-w-md w-full rounded-2xl bg-slate-900/80 border border-white/10 p-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">My Wallets</h3>
        <button onClick={() => setShowWalletsModal(false)} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <div className="space-y-4">
        {Object.entries(wallets).map(([type, address]) => (
          <div key={type}>
            <label className="block text-sm text-slate-400 mb-2">{type} Address</label>
            <div className="flex items-center gap-2">
              <input type="text" readOnly value={address} className="w-full truncate px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none text-sm" />
              <button onClick={() => handleCopyAddress(address, type)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                {copiedAddress === type ? '✅' : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

{/* ✅ NEW: Simple Contact Modal */}
{showContactModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
    <form onSubmit={handleContactSubmit} className="max-w-md w-full rounded-2xl bg-slate-900/80 border border-white/10 p-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Send Me a Message</h3>
        <button type="button" onClick={() => setShowContactModal(false)} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Your Name</label>
          <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="John Doe" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#5fb564]/50 focus:outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">Your Email</label>
          <input type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="john.d@example.com" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#5fb564]/50 focus:outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">Your Message</label>
          <textarea value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} placeholder="Hi! I'd like to discuss a project..." rows={5} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#5fb564]/50 focus:outline-none text-sm resize-none" />
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setShowContactModal(false)} className="w-full px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all font-semibold">Cancel</button>
          <button type="submit" disabled={isSendingMessage} className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#5fb564] to-[#4a9e4e] hover:from-[#7bca7c] hover:to-[#5fb564] transition-all duration-300 font-semibold disabled:opacity-50">{isSendingMessage ? 'Sending...' : 'Send Message'}</button>
        </div>
      </div>
    </form>
  </div>
)}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#00ff7f40] to-[#006b2e30] blur-[120px] opacity-40 animate-blob-move" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-[#7bca7c40] to-[#005a2a40] blur-[150px] opacity-40 animate-blob-move-delayed" />
      <div className="absolute top-[30%] left-[40%] w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-[#00ff8840] to-[#007a3b20] blur-[100px] opacity-30 animate-blob-pulse" />
      
      
      <AnimatePresence>
          {(isLoadingImage || isViewingImage) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsLoadingImage(false);
                setIsViewingImage(false);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md cursor-pointer"
            >
              {isLoadingImage && (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-2xl font-bold text-white">wanna see me..??</h2>
                  <div className="w-32 h-1 bg-white/20 rounded-full mx-auto mt-4 overflow-hidden">
                    <motion.div
                      className="h-full bg-green-400"
                      initial={{ x: "-100%" }}
                      animate={{ x: "0%" }}
                      transition={{ duration: 5, ease: "linear" }}
                    />
                  </div>
                </motion.div>
              )}

              {isViewingImage && (
                <motion.div
                  key="image"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="relative"
                >
                  <img
                    src="/assets/port_img.jpeg"
                    alt="Aakash Jaiswal profile picture maximized"
                    className="max-w-[80vw] max-h-[80vh] rounded-2xl shadow-2xl border-4 border-white/20"
                  />
                </motion.div>
              )}
            </motion.div>
          )}
      </AnimatePresence>

      
      <div className="relative z-10">
        <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-xl font-extrabold tracking-wide uppercase font-logo">AJ</div>
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Up for Collabs</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6 text-sm text-slate-400 mr-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>Network Hashrate: {networkHashrate.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-3">
                {[
                  { icon: <img src = 'assets/x_logo.png' className="w-5 h-5" />, href: 'https://x.com/Aakash_jais03' },
                  { icon: <Github className="w-5 h-5" />, href: 'https://github.com/jaiswalraj03014' },
                  { icon: <Linkedin className="w-5 h-5" />, href: 'https://www.linkedin.com/in/aakash-jaiswal-773bb9244' }, 
                  { icon: <Mail className="w-5 h-5" />, href: 'mailto:jaiswalraj03014@gmail.com' }, 
                ].map((social, i) => (
                  <a key={i} href={social.href} target="_blank" rel="noopener noreferrer" className="...">
                    {social.icon}
                  </a>
                ))}
              </div>
              <button
                onClick={() => setShowWalletsModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-white/5 border-white/10 hover:border-[#5fb564]/50 hover:bg-white/10"
              >
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-medium">Wallets</span>
              </button>
            </div>
          </div>
        </nav>
        <div className="min-h-screen flex items-center justify-center px-6 pt-24 pb-12">
          <div className="max-w-5xl w-full">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                
                <div className="rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm p-6">
                <button
                      onClick={() => {
                        setIsLoadingImage(true);
                        setTimeout(() => {
                          setIsLoadingImage(false);
                          setIsViewingImage(true);
                        }, 5000); // 5-second delay
                      }}
                      className="relative block w-20 h-20 rounded-xl mx-auto mb-4 p-0.5 border-2 border-white/80 group"
                    >
                      <img
                        src="/assets/port_img.jpeg"
                        alt="Aakash Jaiswal profile picture"
                        className="w-full h-full rounded-lg object-cover border-2 border-white/40 transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <p className="text-xs text-white font-semibold">View</p>
                      </div>
                    </button>

                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <h2 className="text-xl font-semibold">Aakash Jaiswal</h2>
                  </div>

                  <p className="text-sm text-slate-400 text-center mb-3">AI & Web3 Developer</p>
                  
                  <RoleTags />
                  
                  <AnimatedQuotes />
                </div>
                
                <CurrentProjects />

              </div>
              <div className="lg:col-span-2">
                 <div className="rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm overflow-hidden">
                  <div className="p-5 border-b border-white/10 bg-black/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Portfolio Assistant</h3><p className="text-xs text-slate-400">Ask me anything about my work</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /><span>Online</span></div>
                    </div>
                  </div>
                  <div ref={chatContainerRef} className="h-[500px] overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className={`flex ${message.isBot ? '' : 'justify-end'}`}
                      >
                      <div className={`max-w-full w-full ${message.component ? '' : 'max-w-[85%]'}`}>
                        <div className={`${message.component ? '' : (message.isBot ? 'bg-white/5 border border-white/10' : 'bg-[#5fb564]/20 border border-[#5fb564]/30') + ' rounded-xl p-4'}`}>
                          {message.component ? message.component : (
                            <div className="text-sm leading-relaxed whitespace-pre-line text-slate-100">{message.text}</div>
                          )}
                        </div>
                      </div>
                      </motion.div>
                    ))}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="flex"
                      >
                        <div className="max-w-[85%] bg-white/5 border border-white/10 rounded-xl p-4">
                          <div className="text-sm leading-relaxed whitespace-pre-line text-slate-100">{typingText}<span className="inline-block w-0.5 h-4 bg-[#7bca7c] ml-1 animate-blink" /></div>
                        </div>
                      </motion.div>
                    )}
                    {!selectedOption && messages.length > 0 && !isTyping && (
                      <div className="pt-4">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          className="text-xs text-slate-500 mb-3"
                        >
                          Quick Actions
                        </motion.div>
                        <motion.div
                          className="grid grid-cols-2 gap-2"
                          initial="hidden"
                          animate="visible"
                          variants={{
                            visible: {
                              transition: {
                                staggerChildren: 0.1, // This creates the staggered delay
                              },
                            },
                          }}
                        >
                          {quickOptions.map((option) => (
                            <motion.div
                              key={option.id}
                              variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0 },
                              }}
                            >
                              <button 
                                onClick={() => handleOptionClick(option.id)} 
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#5fb564]/50 transition-all duration-300 text-left group disabled:opacity-50 disabled:cursor-not-allowed" 
                                disabled={isTyping || !!selectedOption}
                              >
                                <div className="text-slate-400 group-hover:text-[#7bca7c] transition-colors">{option.icon}</div>
                                <span className="text-sm">{option.label}</span>
                              </button>
                            </motion.div>
                          ))}
                        </motion.div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        /* ... (all your existing styles remain the same) ... */
        @font-face {
          font-family: 'SpaceX';
          src: url('/fonts/SpaceX.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        .font-logo {
          font-family: 'SpaceX', sans-serif;
        }
        body {
          font-family: 'Space Grotesk', sans-serif;
        }
        @keyframes blob-move { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(60px, -30px) scale(1.1); } }
        @keyframes blob-move-delayed { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-50px, 40px) scale(0.9); } }
        @keyframes blob-pulse { 0%, 100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.2); opacity: 0.4; } }
        .animate-blob-move { animation: blob-move 20s ease-in-out infinite; }
        .animate-blob-move-delayed { animation: blob-move-delayed 25s ease-in-out infinite; }
        .animate-blob-pulse { animation: blob-pulse 15s ease-in-out infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .animate-blink { animation: blink 1s infinite; }
        .animated-pulse-show:hover { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .7; } }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(10, 10, 10, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #4a9e4e;
          border-radius: 10px;
          border: 2px solid #0A0A0A;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #5fb564;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #4a9e4e rgba(10, 10, 10, 0.2);
        }
        @keyframes pulse-red {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            opacity: 0.7;
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
          }
        }
        .animate-pulse-red {
          animation: pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );  
};

export default ProfessionalPortfolio;