const Project = require('../models/Project.model');

// Mock AI Service for Topic Clash Detection
exports.detectTopicClash = async (req, res) => {
  try {
    const { title, description, domain } = req.body;
    
    // Fetch all existing projects
    const projects = await Project.find({ phase: { $ne: 'COMPLETED' } }).select('title description domain');
    
    const similarProjects = [];
    const keywords = `${title} ${description} ${domain}`.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    for (const p of projects) {
      let score = 0;
      const projectText = `${p.title} ${p.description} ${p.domain}`.toLowerCase();
      
      keywords.forEach(word => {
        if (projectText.includes(word)) score += 10;
      });
      
      if (score > 30) {
        similarProjects.push({
          projectId: p._id,
          title: p.title,
          domain: p.domain,
          similarityScore: Math.min(score, 99) // Mock score up to 99%
        });
      }
    }
    
    // Sort by highest similarity
    similarProjects.sort((a, b) => b.similarityScore - a.similarityScore);
    
    res.json({
      success: true,
      data: similarProjects.slice(0, 5), // Top 5 similar
      message: similarProjects.length > 0 ? 'Potential topic clashes found' : 'No significant clashes detected'
    });
  } catch (error) {
    console.error('Topic clash detection error:', error);
    res.status(500).json({ success: false, message: 'Failed to detect clashes' });
  }
};

// Mock AI Service for Proposal Feedback
exports.generateProposalFeedback = async (req, res) => {
  try {
    const { title, description, domain } = req.body;
    
    // Basic mock AI logic
    let clarityScore = 80;
    let originalityRisk = 'Low';
    let suggestions = [];
    
    if (description.length < 50) {
      clarityScore = 50;
      suggestions.push('Description is too brief. Elaborate on the problem statement and proposed solution.');
    } else {
      suggestions.push('Good description, consider adding more details about the technical stack.');
    }
    
    if (title.toLowerCase().includes('management system')) {
      originalityRisk = 'High';
      suggestions.push('The title sounds generic. Consider a more specific title that highlights your unique approach.');
    }
    
    res.json({
      success: true,
      data: {
        clarityScore,
        originalityRisk,
        suggestions
      }
    });
  } catch (error) {
    console.error('Generate proposal feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate feedback' });
  }
};

// Mock AI Service for Report Feedback Generator
exports.generateReportFeedback = async (req, res) => {
  try {
    const { textContent, type } = req.body; // type: 'weekly_report' or 'deliverable'
    
    let suggestedFeedback = 'Good progress this week. ';
    
    if (!textContent || textContent.length < 100) {
      suggestedFeedback += 'However, the report is lacking in detail. Please provide more comprehensive updates in the future.';
    } else {
      suggestedFeedback += 'The details provided are clear and show consistent effort.';
    }
    
    res.json({
      success: true,
      data: {
        suggestedFeedback
      }
    });
  } catch (error) {
    console.error('Generate report feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report feedback' });
  }
};
