// Comprehensive Guide Data for Competitions as per official event documents
export const GAME_GUIDES = {
  'tech-quiz': {
    eventName: 'Tech Quiz',
    theme: 'Test Your Mind. Beat the Clock.',
    category: 'Technical',
    eventType: 'Technical Competition',
    participation: 'Individual / Duo (Teams of up to 2)',
    totalDuration: '90 Minutes',
    roundsCount: '3 Rounds',
    description: 'Tech Quiz is a fast-paced intellectual competition designed to test participants\' depth of knowledge, logical deduction, and quick-fire recall across Artificial Intelligence, Machine Learning, Computer Science, and modern technological breakthroughs.',
    objectives: [
      'Test breadth and depth of understanding in AI, Machine Learning, and core computer science.',
      'Develop rapid analytical recall and decision-making under intense clock pressure.',
      'Encourage technical curiosity and knowledge sharing among peers.',
      'Recognise and celebrate top technical talent across collegiate batches.'
    ],
    challengeBrief: {
      summary: 'Participants face rapid-fire multiple-choice and short-answer questions spanning fundamental and state-of-the-art topics.',
      focusAreas: [
        'Artificial Intelligence & Machine Learning foundations (Supervised, Unsupervised, Reinforcement Learning).',
        'Deep Neural Networks, Transformers, Large Language Models (LLMs), and Generative AI.',
        'Computer Vision, Natural Language Processing, and Robotics milestones.',
        'Data structures, algorithmic complexity, Python computing libraries, and famous tech history.'
      ],
      topics: [
        'Foundations of Neural Networks & Perceptrons',
        'Transformers, Attention Mechanisms & LLM Architectures',
        'Python for Data Science (NumPy, Pandas, PyTorch)',
        'Key historical milestones in Computing and Turing test pioneers',
        'Ethical AI, Algorithmic Bias & Contemporary AI Developments'
      ]
    },
    eventStructure: [
      {
        roundNumber: 'Round 1',
        name: 'Rapid Fire Technical Trivia',
        duration: '20 Minutes',
        objective: 'Test fundamental technical breadth across foundational computer science and AI concepts.',
        procedure: [
          'All participants answer a series of rapid-fire questions displayed on the main projector screen.',
          'Each question has a strict 30-to-45-second timer.',
          'Participants record answers on their official response sheet or digital device.',
          'Top-performing participants qualify for Round 2.'
        ],
        rules: [
          'No communication between different teams or participants.',
          'Electronic devices and external internet lookups are strictly prohibited.',
          'Answers must be submitted within the allotted countdown window.'
        ]
      },
      {
        roundNumber: 'Round 2',
        name: 'Audio-Visual & Code Debugging',
        duration: '25 Minutes',
        objective: 'Evaluate technical recognition, architectural understanding, and code comprehension.',
        procedure: [
          'Participants identify model architectures, decode obfuscated code snippets, and spot AI-generated visual artifacts.',
          'Includes clues and progressive hints with decaying point values for faster answers.',
          'Top scoring finalists advance to the high-stakes Buzzer Round.'
        ],
        rules: [
          'Responses are written and checked at the conclusion of each segment.',
          'Points are awarded based on accuracy and speed of identification.'
        ]
      },
      {
        roundNumber: 'Round 3',
        name: 'Buzzer & Deductive Problem Solving',
        duration: '25 Minutes',
        objective: 'High-stakes buzzer round testing deductive speed, poise, and deep AI problem-solving.',
        procedure: [
          'Finalists compete simultaneously using a live buzzer system.',
          'Questions range from multi-step mathematical ML problems to cutting-edge research puzzles.',
          'First participant to buzz gets the floor to provide an answer within 5 seconds.'
        ],
        rules: [
          'Buzzing before the question is fully read carries a negative marking risk for incorrect answers.',
          'Answers must be spoken clearly and immediately upon buzzing.'
        ]
      }
    ],
    rulesAndRegulations: [
      'Participation is individual or in registered teams of two.',
      'Mobile phones, smartwatches, and external browser lookup are strictly prohibited.',
      'All answers must be submitted within the active stage timers.',
      'Misconduct, cross-talk, or unauthorized assistance will lead to immediate disqualification.',
      'The quizmaster and judging panel decisions are final and binding.'
    ],
    expectedLearningOutcomes: [
      'Sharpen quick-thinking, memory recall, and technical reasoning under time constraints.',
      'Broaden awareness of foundational AI architectures and emerging GenAI tech.',
      'Develop composure and confidence in competitive technical environments.'
    ],
    eventSummary: 'TECH QUIZ — TEST YOUR MIND. BEAT THE CLOCK. A premier arena celebrating intellectual curiosity, algorithmic brilliance, and competitive spirit.'
  },

  'reverse-prompt': {
    eventName: 'PROMPT DECODE',
    theme: 'Reverse Prompt Engineering – AI Image Recreation Challenge',
    category: 'Technical',
    eventType: 'Technical Competition',
    participation: 'Individual',
    totalDuration: '90 Minutes',
    roundsCount: '2 Rounds (Round 1: Visual Analysis; Round 2: Prompt Engineering & Generation)',
    description: 'PROMPT DECODE is an AI-based competition that challenges participants to recreate a given reference image using carefully constructed text prompts. Participants are shown a reference image and must analyse its visual elements, understand its composition, and write a detailed prompt that makes an approved AI image-generation platform produce a visually similar image. The competition evaluates observation skills, prompt engineering ability, creativity, analytical thinking and practical understanding of generative AI.',
    objectives: [
      'Develop practical knowledge of reverse prompt engineering.',
      'Improve visual observation and analytical thinking.',
      'Understand how text prompts influence AI-generated outputs.',
      'Encourage creativity and problem-solving through generative AI.',
      'Develop skills in refining prompts to achieve desired results.'
    ],
    challengeBrief: {
      summary: 'Participants receive a reference image and must construct a detailed text prompt describing its key visual attributes to recreate it as closely as possible.',
      focusAreas: [
        'Objects and subjects (identifying primary, secondary, and foreground/background elements).',
        'Colours, lighting conditions, highlights, shadows, and atmospheric ambience.',
        'Composition, framing, camera angle, perspective, and aspect ratio.',
        'Artistic style, medium (digital render, photograph, watercolor, oil painting), and visual texture.'
      ],
      strictRule: 'Uploading the reference image to AI tools or external image-to-prompt generators for automatic prompt extraction is strictly prohibited. All prompts must be manually written from observation.'
    },
    eventStructure: [
      {
        roundNumber: 'Round 1',
        name: 'Visual Analysis',
        duration: '15 Minutes',
        objective: 'Observe the reference image displayed on the projector and printed at the desk, identify key elements, and take handwritten notes.',
        procedure: [
          'A high-resolution reference image is displayed on the venue projector and a physical reference is provided.',
          'Participants examine subjects, background, colour palette, lighting, camera angle, and artistic nuances.',
          'Participants take handwritten notes to prepare prompt building for Round 2.'
        ],
        rules: [
          'Round 1 carries no marks; it is strictly an observation and note-taking preparation round.',
          'Laptops and digital devices remain closed or idle during Round 1.'
        ]
      },
      {
        roundNumber: 'Round 2',
        name: 'Prompt Engineering & AI Image Generation',
        duration: '60 Minutes (3 Stages)',
        objective: 'Construct, submit, generate, and iteratively refine prompts using the approved AI generation platform.',
        stages: [
          {
            stageName: 'Stage 1 – Prompt Creation & Submission (25 Mins)',
            desc: 'Participants write a comprehensive prompt describing the image elements and submit their initial prompt through the official submission form.'
          },
          {
            stageName: 'Stage 2 – Image Generation & Refinement (25 Mins)',
            desc: 'Participants generate images on the approved AI platform. A maximum of THREE generation attempts is permitted (1 attempt = 1 click of Generate). Prompts may be modified between attempts.'
          },
          {
            stageName: 'Stage 3 – Final Submission (15 Mins)',
            desc: 'Submit initial prompt, modified versions, final generated image, and platform history screenshot verifying attempt counts.'
          }
        ],
        rules: [
          'Maximum of THREE image-generation attempts per participant.',
          'All participants must use the designated approved AI platform with standardized model settings.',
          'Initial prompt must be submitted via the form before image generation begins.'
        ]
      }
    ],
    rulesAndRegulations: [
      'Participation is strictly individual.',
      'All participants receive the identical reference image.',
      'Uploading reference images to image-to-prompt extractors or reverse AI image engines is prohibited.',
      'A maximum of THREE image generation attempts is permitted (1 attempt = 1 click on Generate).',
      'All participants must use the designated AI platform and declared model parameters.',
      'Copied prompts, pre-generated images, or unauthorized external assistance will result in disqualification.',
      'All versions, screenshots, and outputs must be submitted within the allotted timeframe.',
      'The judges\' decision is final.'
    ],
    expectedLearningOutcomes: [
      'Gain practical exposure to generative AI platforms and prompt engineering techniques.',
      'Understand the mechanics of reverse prompt engineering and visual-to-text semantic mapping.',
      'Develop disciplined observational skills and compositional awareness.',
      'Master prompt refinement within constrained generation budgets.'
    ],
    eventSummary: 'PROMPT DECODE – OBSERVE. ANALYSE. PROMPT. CREATE. A challenge testing the boundary between visual perception and precise machine prompting.'
  },

  'ui-ux-makeover': {
    eventName: 'UI/UX Makeover Challenge',
    theme: 'From Complicated to Convenient',
    category: 'Technical',
    eventType: 'Technical Competition',
    participation: 'Individual (one participant per entry)',
    totalDuration: '90 Minutes',
    roundsCount: '3 Rounds (Investigation, Makeover, Presentation)',
    description: 'The UI/UX Makeover Challenge is a design competition in which participants are given an existing website interface and must identify its usability, navigation, accessibility and functionality problems. Participants then redesign the webpage to make it more intuitive, accessible, visually appealing and comfortable for everyone to use. The focus is on improving the user experience rather than simply making the webpage look attractive.',
    objectives: [
      'Develop the ability to critically evaluate real-world website interfaces from the user\'s perspective.',
      'Identify usability, navigation, accessibility, and functionality bottlenecks.',
      'Apply user-centred and inclusive design thinking to create seamless solutions.',
      'Practise redesigning interfaces with industry tools such as Figma, Canva, and Penpot.',
      'Learn to present, articulate, and justify design decisions clearly.'
    ],
    challengeBrief: {
      summary: 'Participants receive a reference website and a specific user scenario to diagnose and redesign.',
      exampleReferenceSites: [
        'National Scholarship Portal (NSP)',
        'DigiLocker Services Portal',
        'UMANG Citizen Portal',
        'India.gov.in Services Directory'
      ],
      scenarioExample: 'A student wants to find a government scholarship, verify eligibility criteria, understand mandatory documentation, and submit an application. Redesign the portal interface to make this entire journey simple, organized, and error-free.',
      keyImprovementAreas: [
        'Confusing navigation and buried critical links.',
        'Poor layout hierarchy and cramped readability.',
        'Inconsistent UI elements, typography, and button styles.',
        'Accessibility gaps (poor contrast, non-scalable fonts, unlabelled forms).',
        'Unclear instructions and frustrating user interaction paths.'
      ]
    },
    eventStructure: [
      {
        roundNumber: 'Round 1',
        name: 'UX Investigation',
        duration: '15 Minutes',
        objective: 'Explore the assigned reference website and audit existing usability and accessibility friction points.',
        procedure: [
          'Participants access the target reference website on their laptops.',
          'Review the provided user scenario and trace the end-to-end user journey.',
          'Document friction points in navigation, visual hierarchy, clarity, and accessibility.'
        ],
        rules: [
          'Investigation notes must guide the subsequent redesign phase.',
          'All participants work on the same reference website.'
        ]
      },
      {
        roundNumber: 'Round 2',
        name: 'Design Makeover',
        duration: '35 Minutes',
        objective: 'Redesign the webpage to make it intuitive, accessible, visually coherent, and practical.',
        procedure: [
          'Design using tools such as Figma, Canva, Penpot, or other UI software.',
          'Focus on clear visual hierarchy, accessible typography/contrast, simplified forms, and intuitive navigation.',
          'Create responsive layouts tailored for modern desktop and mobile viewports.'
        ],
        rules: [
          'Participants must create original redesigns; template copying is prohibited.',
          'A coded website is NOT required; design exports and interactive prototypes are expected.'
        ]
      },
      {
        roundNumber: 'Round 3',
        name: 'Design Presentation & Final Submission',
        duration: '30 Minutes (20 Mins Presentation + 10 Mins Submission)',
        objective: 'Present redesign rationale to judges and submit final interface deliverables.',
        procedure: [
          'Each participant receives 3–4 minutes to pitch their redesign.',
          'Explain problems identified, key design interventions, and accessibility benefits.',
          'Submit final Figma/Canva link, design screenshots, and summary of improvements.'
        ],
        rules: [
          'Adhere strictly to individual presentation timers.',
          'Focus pitch on usability advantages rather than visual embellishments.'
        ]
      }
    ],
    rulesAndRegulations: [
      'This is an individual participation event.',
      'All participants receive the identical reference website and challenge scenario.',
      'Designs must be completed within the allocated 90-minute timeframe.',
      'Plagiarism or copying from other participants will lead to disqualification.',
      'Designs must prioritize usability, accessibility, and functional practicality over mere decorative aesthetics.',
      'The judges\' decision is final.'
    ],
    expectedLearningOutcomes: [
      'Master usability audits and empathetic heuristic evaluation.',
      'Understand WCAG accessibility standards, contrast ratios, and inclusive design.',
      'Gain hands-on speed and dexterity with Figma/Canva design workflows.',
      'Develop persuasive design communication and storytelling skills.'
    ],
    eventSummary: 'UI/UX MAKEOVER CHALLENGE – FROM COMPLICATED TO CONVENIENT. Good design is not merely what looks good; it is what makes life effortless for everyone.'
  },

  'sell-me-product': {
    eventName: 'Sell Me This Product',
    theme: 'The Art of Persuasion',
    category: 'Non-Technical',
    eventType: 'Non-Technical Competition',
    participation: 'Individual (one participant per entry)',
    totalDuration: '90 Minutes',
    roundsCount: '2 Rounds (Round 1: Sales Pitch; Round 2: Customer Challenge)',
    description: 'Sell Me This Product is a competition in which participants must sell an ordinary, unusual or unexpected product using their creativity, communication skills and convincing abilities. The objective is to transform an ordinary product into something desirable by highlighting its value, creating an interesting sales pitch and persuading customers to purchase it. The focus is on how effectively participants present, promote and sell a product rather than the actual product itself.',
    objectives: [
      'Develop creativity and original thinking under spontaneous pressure.',
      'Improve spoken communication, vocal dynamics, and stage presence.',
      'Learn to position the unique value of a product in an engaging way.',
      'Master rapid objection handling and customer psychology.',
      'Harness storytelling, humour, and empathy in persuasive discourse.'
    ],
    challengeBrief: {
      summary: 'Participants draw a mystery everyday product and must deliver an irresistible sales pitch, followed by handling live customer objections from the judge.',
      exampleProducts: [
        'Empty cardboard box',
        'Broken umbrella',
        'Reusable water bottle',
        'Standard paper clip',
        'Day-old newspaper',
        'Single left slipper',
        'Empty ballpoint pen',
        'Monobloc plastic chair',
        'Smooth river stone',
        'Ordinary plastic bucket',
        'Toothbrush with no bristles',
        'Sunglasses with one dark lens'
      ],
      conceptExample: 'A participant receives an empty cardboard box. Instead of describing it as packaging trash, they pitch it as an eco-friendly modular cat fortress, a minimalist storage organizer, or a children\'s imagination canvas.'
    },
    eventStructure: [
      {
        roundNumber: 'Round 1',
        name: 'The Sales Pitch',
        duration: '40 Minutes',
        objective: 'Pitch the assigned product to the judge with flair, value proposition, and conviction.',
        procedure: [
          'Participants randomly draw a product card from the organizer\'s collection.',
          'All participants receive 5 minutes of preparation time.',
          'Each participant delivers a 1-minute elevator pitch directly to the judging panel.',
          'The top 5 scoring participants advance to Round 2 as finalists.'
        ],
        rules: [
          'Strict 1-minute pitch window.',
          'Props are limited to the assigned object or imaginative demonstration.',
          'Pitches must remain professional, witty, and convincing.'
        ]
      },
      {
        roundNumber: 'Round 2',
        name: 'The Customer Challenge',
        duration: '25 Minutes',
        objective: 'Handle real-world customer skepticism, price objections, and tough counterarguments.',
        procedure: [
          'Finalists draw a surprise customer objection card (e.g., "Too expensive", "Already own one", "Why do I need this?").',
          '30 seconds to analyze the customer persona and formulate a response.',
          'Deliver an interactive 4–5 minute persuasion response answering judge follow-up challenges.'
        ],
        rules: [
          'Participants must address the customer objection directly without evading.',
          'Judge roleplays as the skeptical customer.'
        ]
      }
    ],
    rulesAndRegulations: [
      'Individual participation only.',
      'Products and objection scenarios are assigned strictly at random.',
      'Participants must adhere to the 1-minute Round 1 and 4–5 minute Round 2 timers.',
      'Reading from pre-written scripts or phones is prohibited.',
      'Appropriate language, decorum, and positive stage presence must be observed.',
      'Judges\' evaluation is final and binding.'
    ],
    expectedLearningOutcomes: [
      'Sharpen impromptu public speaking and poise under observation.',
      'Learn core sales psychology: pain points, value framing, and closing deals.',
      'Cultivate quick-witted humour, adaptability, and persuasive storytelling.'
    ],
    eventSummary: 'SELL ME THIS PRODUCT – THE ART OF PERSUASION. Selling isn\'t about pushing items; it\'s about discovering value where others see only the ordinary.'
  },

  'jam': {
    eventName: 'Just A Minute (JAM)',
    theme: 'Think Fast. Speak Smart.',
    category: 'Non-Technical',
    eventType: 'Non-Technical Competition',
    participation: 'Individual (one participant per entry)',
    totalDuration: '90 Minutes',
    roundsCount: '2 Rounds (Round 1: One-Minute Challenge; Round 2: Advanced JAM Challenge)',
    description: 'Just A Minute (JAM) is a speaking activity designed to test participants\' spontaneity, communication skills, confidence and ability to think quickly. Participants are given unexpected topics and must speak continuously and meaningfully within the allotted time without hesitation, repetition or deviation from the topic. The objective is to evaluate how effectively participants organise their thoughts, express ideas and maintain fluency under time pressure.',
    objectives: [
      'Develop spontaneity and the ability to think instantly on one\'s feet.',
      'Improve spoken English fluency, vocal projection, and confidence.',
      'Practise rapid thought organization while staying rigorously relevant.',
      'Integrate humour, personal anecdotes, examples, and creative metaphors.',
      'Maintain composure and poise under strict countdown pressure.'
    ],
    challengeBrief: {
      summary: 'Speak continuously on a surprise topic for the full duration without committing the three cardinal JAM fouls.',
      threeCardinalRules: [
        {
          rule: 'No Hesitation',
          desc: 'Avoid unnatural pauses, long silences, stammering, or filler sounds (um, ah, like).'
        },
        {
          rule: 'No Repetition',
          desc: 'Do not repeat identical words, sentences, or circular concepts redundantly.'
        },
        {
          rule: 'No Deviation',
          desc: 'Do not drift away from the central theme into unrelated tangents.'
        }
      ],
      sampleTopics: [
        'Is social media bringing people closer or pushing them apart?',
        'Money can buy happiness.',
        'Artificial Intelligence: A blessing or a threat?',
        'Life without the internet.',
        'Failure is the first step towards success.',
        'Silence speaks louder than words.',
        'A world without smartphones.',
        'Can failure be more valuable than success?',
        'If time could be purchased, would life become easier?',
        'Imagine a world where nobody could lie.'
      ]
    },
    eventStructure: [
      {
        roundNumber: 'Round 1',
        name: 'The One-Minute Challenge',
        duration: '40 Minutes',
        objective: 'Demonstrate basic speaking fluency, confidence, spontaneity, and strict relevance for 60 seconds.',
        procedure: [
          'Each participant randomly picks one topic from the topic collection.',
          'Receive 30 seconds of thinking time.',
          'Speak continuously for 1 minute.',
          'The judge uses a bell/buzzer to penalize hesitation, repetition, or deviation.',
          'The top 5 participants advance to Round 2.'
        ],
        rules: [
          'Participants must speak for the full 60 seconds.',
          'If a buzzer sounds for a minor violation, continue speaking immediately if time remains.',
          'Scripts and notes are prohibited.'
        ]
      },
      {
        roundNumber: 'Round 2',
        name: 'The Advanced JAM Challenge',
        duration: '25 Minutes',
        objective: 'Handle complex, abstract, and paradoxical topics with 2 minutes of continuous speaking.',
        procedure: [
          'Finalists draw challenging, abstract topics.',
          'Receive 30 seconds of preparation.',
          'Speak continuously for 2 full minutes with elevated depth, originality, and continuity.',
          'Judge enforces buzzer penalties for any breakdown in flow.'
        ],
        rules: [
          'Full 2-minute speaking duration.',
          'High penalties for filler phrases or repetitive circling.'
        ]
      }
    ],
    rulesAndRegulations: [
      'Individual participation event.',
      'Topics are assigned strictly by random draw.',
      'Participants must speak only on their assigned topic.',
      'Strict adherence to 30-second prep, 1-minute Round 1, and 2-minute Round 2 timers.',
      'Hesitation, repetition, and deviation from topic are penalised.',
      'Reading from written notes or mobile devices is strictly prohibited.',
      'The judge\'s buzzer indicator and evaluations are final.'
    ],
    expectedLearningOutcomes: [
      'Overcome public speaking inhibition and fear of the clock.',
      'Train neural pathways for rapid articulate thought assembly.',
      'Learn concise, filler-free communication valuable in interviews and presentations.'
    ],
    eventSummary: 'JUST A MINUTE (JAM) – THINK FAST. SPEAK SMART. Words are cheap; clear, concise, and spontaneous articulation is priceless.'
  }
};

