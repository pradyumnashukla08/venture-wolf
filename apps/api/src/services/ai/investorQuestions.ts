export const INVESTOR_QUESTIONS: Record<string, Record<string, string[]>> = {
  "pre-seed": {
    "SaaS": [
      "Manual Workarounds: How are your prospective users solving or struggling through this problem today using spreadsheets or duct-tied tools?",
      "Problem Urgency: Is the pain point you are solving a 'top three' burning priority for a CIO/buyer, or is it just a nice-to-have feature?",
      "Discovery Velocity: How many deep user discovery interviews have you personally conducted in the last 30 days, and what changed in your roadmap because of them?",
      "MVP Definition: What is the absolute smallest, bare-minimum set of features you can ship to deliver instant, tangible value to your first user?",
      "Friction Identification: Why do current software solutions in this niche suffer from low adoption or high user frustration?",
      "Founder Moat: Why are you uniquely qualified to build this specific software, and why did you choose this exact problem over any other?",
      "Bootstrap Resourcefulness: What have you built or validated using zero capital, low-code tools, or manual processes so far?",
      "Ideal Customer Profile: Can you describe the exact job title, company size, and daily frustration of your absolute perfect initial user?",
      "Feedback Loop: How fast can you gather user feedback, iterate on the code, and redeploy a change back to your test users?"
    ],
    "Manufacturing & Hardware": [
      "Scientific Breakthrough: What is the core engineering or material science breakthrough that makes your physical product possible now?",
      "Feasibility Proof: What physical proof-of-concept or rudimentary prototype have you built to prove that the core tech actually works?",
      "IP Cleanliness: Do you fully own the intellectual property, or is it tangled up in a university, research lab, or former employer?",
      "Regulatory Roadblocks: What specific safety, environmental, or industry-standard certifications (e.g., CE, UL, FDA) will your product require before sale?",
      "Bill of Materials: What is your rough initial Bill of Materials (BOM) cost, and what is your target manufacturing cost at scale?",
      "Supply Vulnerabilities: What key components or raw materials in your design represent a single point of failure in the global supply chain?",
      "Partner Interest: Have you had early discussions with contract manufacturers, and do they have the technical capability to build this?",
      "Design Cycle Speed: How long does it take your team to design, iterate, 3D print, or assemble a new physical prototype iteration?",
      "Capital Intensity: Exactly how much capital do you need to reach a functional, field-testable alpha unit?",
      "Customer Intent: What explicit evidence (letters of intent, emails, co-development requests) do you have that industrial buyers want this physical machine?"
    ],
    "Services & Agencies": [
      "Domain Mastery: What specific operational excellence or proprietary methodology do you possess that traditional agencies lack?",
      "Arbitrage Opportunity: Where is the gap between what clients are willing to pay for this outcome and what it costs you to deliver it?",
      "Initial Client Origin: How did you secure your first 23 paying clients without a marketing budget or established brand?",
      "Delivery Bottlenecks: Which specific part of your service delivery relies entirely on your personal time, and how do you remove yourself?",
      "Talent Sourcing: Where will you find and interview the highly specialized talent needed to deliver this service at an elite level?",
      "Client Retention Plan: Why will your first batch of clients stay with you for a full year instead of completing a single project and leaving?",
      "Pricing Architecture: Are you selling your service based on hourly billing, project milestones, or fixed value-based monthly retainers?",
      "Sales Pipeline Creation: What repeatable, non-spammy outreach strategy are you using to consistently get introduction meetings with decision-makers?",
      "Margin Structure: What are your gross margins on your initial projects after accounting for the labor costs of delivery?",
      "Productization Potential: Which element of your service is repetitive enough that it could eventually be turned into a standardized productized service?"
    ]
  },
  "seed": {
    "SaaS": [
      "Retention Curve: What does your cohort retention curve look like, and does it flatten out over time or trend straight down to zero?",
      "Value Metric: What specific action inside your software (e.g., reports run, files synced) proves a user is getting real value?",
      "Organic Attraction: What percentage of your current user base found your software organically versus through paid marketing channels?",
      "Conversion Mechanics: What is your exact conversion rate from a free trial or proof-of-concept to a fully paying corporate contract?",
      "Sales Cycle Length: How many days does it take from the initial introductory call to a signed software license agreement?",
      "Customer Disappointment: What do your early users say they would do if your software went bankrupt or shut down tomorrow?",
      "Feature Prioritization: How do you decide which customer feature requests to build next versus which ones to explicitly reject?",
      "Hiring Magnetism: How did you convince your earliest engineers to leave stable, high-paying jobs to join your unproven software startup?",
      "Runway Allocation: Exactly how many months of runway will this seed round buy you, and what specific metrics will it unlock for Series A?",
      "Economic Buyer Identity: Who is signing the check for your software, and is that person different from the employee who uses it daily?"
    ],
    "Manufacturing & Hardware": [
      "Pilot Performance: How are your first physical units performing in real-world customer pilot tests, and what is failing most often?",
      "LOI Binding Conversion: What specific performance milestones must your prototype hit to convert your Letters of Intent (LOIs) into binding purchase orders?",
      "Tooling Requirements: What are the upfront capital costs required for hard tooling, molds, or specialized assembly machinery to start production?",
      "Yield Rates: Out of every 100 units you attempt to manufacture or assemble right now, how many pass quality control?",
      "Lead Time Mechanics: What is the current end-to-end lead time from ordering raw components to shipping a finished product to a buyer?",
      "Working Capital Needs: How much cash will be locked up in physical inventory and raw materials as you fulfill your first production run?",
      "Margin Progression: How does your gross margin improve when you move from building 10 units a month to building 500 units a month?",
      "Field Service Plan: How do you plan to handle repairs, warranty claims, and physical product maintenance when units break at customer sites?",
      "Distribution Strategy: Will you sell this equipment directly to enterprises using an internal sales team, or rely on industrial distributors?",
      "Factory Footprint: Are you using a domestic contract manufacturer, an offshore factory, or assembling these units in your own facility?"
    ],
    "Services & Agencies": [
      "Utilization Rates: What percentage of your delivery team's available weekly hours are currently billed directly to paying client projects?",
      "Revenue Predictability: What percentage of your monthly revenue comes from predictable, recurring retainers versus unpredictable, one-off projects?",
      "Client Concentration Risk: Does your largest single client represent more than 30% of your total company revenue?",
      "Service Blueprinting: Do you have a documented, step-by-step playbook for how your services are delivered, or is it all inside the team's heads?",
      "CAC Validation: How much cash or sales effort does it cost you to acquire a new corporate service client?",
      "Hiring Velocity: How long does it take you to find, hire, onboard, and fully ramp a new account manager or delivery specialist?",
      "Scope Creep Management: How do you protect your profit margins when a client demands extra work outside the original project agreement?",
      "Net Promoter Score: What is your client satisfaction score, and what is the primary reason a client gives you a negative review?",
      "Capacity Limits: At your current headcount, how many more clients can you onboard before project quality begins to suffer?",
      "Up-sell Playbook: What structured process do you use to sell additional services or larger project scopes to your existing client base?"
    ]
  },
  "series-a": {
    "SaaS": [
      "Net Revenue Retention: What is your Net Revenue Retention (NRR) percentage, and is expansion revenue from old accounts outgaining churn?",
      "CAC Payback Period: How many months of software subscription revenue does it take to fully recover the cost of acquiring a customer?",
      "LTV to CAC Ratio: Is your lifetime value to customer acquisition cost ratio healthy (3x+) or are you buying growth inefficiently?",
      "Sales Rep Ramping: How long does it take for a newly hired Account Executive (AE) to hit their full sales quota?",
      "Pipeline Predictability: What percentage of your sales pipeline is generated by inbound marketing versus outbound cold sales development?",
      "Win/Loss Analysis: When you lose an enterprise software deal in the final stages, who are you losing to most frequently?",
      "Pricing Power: Have you successfully raised your subscription prices on existing customers, and what happened to your churn when you did?",
      "Choke Points: Where is the biggest drop-off in your sales funnel (e.g., discovery call to demo, or demo to proposal)?",
      "Executive Hiring: Which specific C-level roles (e.g., VP of Sales, VP of Product) are you hiring immediately with this Series A cash?",
      "Market Expansion Route: How will you use this capital to move from your initial vertical market into adjacent industry verticals?"
    ],
    "Manufacturing & Hardware": [
      "Production Scalability: Can your contract manufacturer scale production by 10x over the next 12 months without requiring new factory lines?",
      "Tier-1 Supplier Access: Have you moved away from secondary component brokers to direct, long-term contracts with Tier-1 component factories?",
      "Warranty Liabilities: What percentage of your revenue are you setting aside to cover product warranties, field failures, and returns?",
      "Value-Add Software (Hardware SaaS): What percentage of your total revenue is high-margin recurring software attached to the physical hardware?",
      "Inventory Turnover: How many times per year do you fully turn over your physical inventory, and how can you optimize that cash loop?",
      "Factory Audits: Have your manufacturing facilities passed rigorous external quality and environmental audits required by enterprise buyers?",
      "Logistics & Warehousing: How do you manage global shipping, freight costs, customs delays, and regional warehousing logistics?",
      "Cost Reduction Curve: What is your explicit engineering plan to reduce unit manufacturing costs by 20% over the next two years?",
      "Sales Channel Conflict: How do you manage pricing or territory conflict between your direct sales team and independent distributor networks?",
      "Capex vs Opex Split: How much of this Series A funding is going into fixed factory infrastructure (Capex) versus operational scaling (Opex)?"
    ],
    "Services & Agencies": [
      "Labor Gross Margin: Are you maintaining a healthy 50% to 60% gross margin on labor after accounting for all delivery salaries and benefits?",
      "Manager Overhead Layer: Can your delivery teams operate independently under middle managers, or do founders still step in to solve client crises?",
      "Client Tenure Profile: What is the average lifespan of a client relationship in terms of months, and how has that shifted as you grew?",
      "Inbound Brand Authority: Do you routinely win large client contracts because of your industry thought leadership, whitepapers, or proprietary data?",
      "Outbound Sales Machine: Do you have a functional, predictable outbound sales team that schedules meetings without founder involvement?",
      "Geographic Expansion: Are you confined to your local or domestic market, or have you built a framework to deliver services globally?",
      "Knowledge Management: How do you capture, organize, and institutionalize project insights so that client value isn't lost when an employee quits?",
      "Standardized Onboarding: What is the exact timeline and step-by-step process for a new client to go from a signed contract to their first deliverable?",
      "Bench Strength Cost: How much capital do you spend maintaining unassigned delivery talent (\"on the bench\") to prepare for sudden client influxes?",
      "Framework Scalability: Is your service delivery framework flexible enough to handle complex, bespoke enterprise projects without breaking down?"
    ]
  },
  "series-b": {
    "SaaS": [
      "Burn Efficiency: What is your Hype Factor or Net Burn Efficiency ratiohow many dollars of venture capital do you burn to add $1 of ARR?",
      "Enterprise Penetration: What percentage of the Fortune 500 are active customers, and what is your land-and-expand strategy within them?",
      "Logo vs Revenue Churn: Is your logo churn high but masked by heavy expansion revenue from a few massive accounts?",
      "Market Saturation Limits: Are you seeing customer acquisition costs rise in your primary target market, signaling that it is becoming saturated?",
      "Product Suite Breadth: Can you evolve from a single software point-solution into an all-in-one platform suite that controls the customer's workflow?",
      "International Adaptation: How successfully have your sales, localization, and compliance infrastructure scaled in overseas markets?",
      "Ecosystem Moat: How many third-party developers or software integrations are built on top of your platform APIs today?",
      "Competitive Displacement: What percentage of your new sales pipeline comes from actively ripping out and replacing your primary competitor?",
      "M&A Readiness: Are there smaller software tools or teams in your space that you plan to acquire using your Series B balance sheet?",
      "Path to Profitability: If the venture capital markets locked up tomorrow, how many quarters would it take for this business to reach cash-flow positive?"
    ],
    "Manufacturing & Hardware": [
      "Global Logistics Network: Do you have multi-regional manufacturing or dual-sourcing strategies to protect against geopolitical trade disputes or tariffs?",
      "Global Compliance Mastery: Does your hardware comply with all safety, recycling, and disposal laws (e.g., RoHS, WEEE) across Europe, Asia, and the Americas?",
      "Working Capital Lines: Have you secured non-dilutive bank debt, asset-backed loans, or revolving credit lines to finance your physical inventory?",
      "Field Automation Strategy: How are you using predictive maintenance and IoT sensor data to fix physical units before they break down for a client?",
      "Secondary Market Volume: Is there a robust secondary or refurbished market for your older equipment models, and do you control it?",
      "Patent Portfolio Strength: How many granted utility patents do you hold, and have they successfully withstood legal challenges or copycats?",
      "Plant Capacity Optimization: What is the current capacity utilization percentage of your manufacturing lines, and when do you need to build a new factory?",
      "End-of-Life Management: What is your operational strategy for recycling, upgrading, or decommissioning large industrial machines at the end of their lifecycle?",
      "Commoditization Defense: As cheaper component alternatives emerge, how do you prevent your hardware margins from eroding into a commodity price war?",
      "Consolidation Target Status: Which global industrial conglomerates view your hardware technology as an existential threat or a major acquisition target?"
    ],
    "Services & Agencies": [
      "Corporate Value Multiplication: How are you shifting your company's financial valuation from a low-multiple service business to a high-multiple platform?",
      "Proprietary Technology Assets: Have you built proprietary, internal software tools that allow your team to deliver services 3x faster than rivals?",
      "Key-Man Dependency Elimination: If all original founders left the company tomorrow, would client retention or new sales growth drop by even 5%?",
      "Global Delivery Footprint: How do you manage quality, culture, and around-the-clock delivery across offshore, nearshore, and onshore talent hubs?",
      "Master Service Agreements (MSAs): What percentage of your business is locked into long-term, multi-year Master Service Agreements with global brands?",
      "Strategic Partnerships: Do you have active, exclusive referral partnerships with major technology vendors who direct clients to you for implementation?",
      "M&A Roll-up Playbook: Can you efficiently acquire and integrate smaller, regional boutique agencies to buy market share and talent?",
      "Brand Premium Justification: Why are enterprise clients willing to pay a 40% premium to work with your agency over a mid-market competitor?",
      "Regulatory Compliance Scale: How do you ensure data security, privacy compliance (e.g., SOC2, GDPR), and liability protection across thousands of client projects?",
      "Public or Private Exit Runway: Are your current margins, scale, and operational predictability building toward an IPO or a private equity buyout?"
    ]
  }
};

export const INVESTOR_FAQ_QUESTIONS = {
  "Basic_Round1": [
    "General: What does the company do? Explain in 1 minute.",
    "General: What is unique about the company? What big problem does it solve? Is it the real problem?",
    "Founders: What is your story? Is the founder personally attached to the problem or faced the problem before starting this startup?",
    "Founders: Who are the co-founders and key team members?",
    "Products: Why do users care about your product or service?",
    "Products: Can you provide a demonstration of the product or service?"
  ],
  "Intermediate_Round2_3": [
    "General: How big is the market opportunity? Where are you based at? Why are you based there?",
    "Founders: What is their equity Split and why so? Are they all full time into this business?",
    "Founders: What relevant domain experience does the team have? Why is the team uniquely capable to execute the company's business plan?",
    "Founders: How much money has each co-founder invested? What motivates the co-founders?",
    "Products: What are the key differentiated features of your product or service? What have you learned from early versions?",
    "Competition: Who are the company's competitors? What is their market share? Who is the market leader?",
    "Competition: Compared to your competition, how do you compete with respect to price, features, and performance?",
    "Marketing: How does the company market or plan to market its products or services?",
    "Marketing: What is the cost of a customer acquisition? What is the projected lifetime value of a customer?",
    "Traction: What traction has the company got till date? How can your traction be accelerated?",
    "IP: What key intellectual property does the company have? Does it violate third-party rights?"
  ],
  "Advanced_Round4_Acquisition": [
    "Acquisition: Why are you looking to get acquired? Why should we acquire you?",
    "Acquisition: What will you do if you do not find a buyer? Do you have any interest from anyone currently?",
    "Acquisition: What is the valuation at which you are looking to get acquired? Are you looking for a partial or full exit?",
    "Acquisition: What are your plans post the acquisition? What kind of help and support will you provide us?",
    "Financials: What are the company's three/five-year projections if we acquire it and pump in the required money?",
    "Financials: What are the key assumptions underlying your projections? How much burn will occur until profitability?",
    "Financials: How much equity and debt has the company raised; what is the capitalization structure?",
    "Risks: What do you see as the principal risks to the business? Legal, regulatory, or product liability risks?"
  ]
};




