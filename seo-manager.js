/**
 * Dynamic SEO Manager for Flame Mod Paradise
 * Pulls data from JSON files and generates SEO content
 */

class SEOManager {
    constructor() {
        this.seoData = {
            brand: {
                name: "Flame Mod Paradise",
                shortName: "FMP",
                tagline: "Best Discord Server for Free Cookies",
                description: "Professional cookie checkers, account checkers, and combo checkers for 40+ platforms"
            },
            popularTerms: [
                "FMP", "Flame Mod Paradise", "best discord server", "best discord cookie server",
                "free cookies", "free netflix", "free chatgpt", "free claude ai", "free spotify", 
                "free crunchyroll", "best telegram server", "best telegram channel", "cookie giveaway",
                "free netflix cookies", "free chatgpt cookies", "free spotify cookies", 
                "discord cookie server", "telegram cookie channel"
            ],
            platforms: [],
            tools: [],
            keywords: []
        };
        
        this.loadData();
    }

    async loadData() {
        try {
            // Load SEO configuration
            const seoConfigResponse = await fetch('data/seo-config.json');
            const seoConfig = await seoConfigResponse.json();
            
            // Update brand info from config
            this.seoData.brand = seoConfig.brand;
            this.seoData.popularTerms = seoConfig.popularSearchTerms;
            
            // Load checkers data
            const checkersResponse = await fetch('data/checkers.json');
            const checkers = await checkersResponse.json();
            
            // Load other tools data
            const [membershipResponse, othersResponse, toolsResponse] = await Promise.all([
                fetch('data/membership.json'),
                fetch('data/others.json'),
                fetch('data/tools.json')
            ]);
            
            const membership = await membershipResponse.json();
            const others = await othersResponse.json();
            const tools = await toolsResponse.json();

            this.processToolsData(checkers, membership, others, tools, seoConfig);
            this.generateSEO();
            
        } catch (error) {
            console.error('Error loading SEO data:', error);
            // Fallback to hardcoded data
            this.generateSEO();
        }
    }

    processToolsData(checkers, membership, others, tools, seoConfig) {
        // Process checkers
        checkers.forEach(tool => {
            this.seoData.platforms.push({
                name: tool.name,
                type: "cookie checker",
                keywords: tool.keywords || this.generateToolKeywords(tool.name)
            });
        });

        // Process other tools
        [...membership, ...others, ...tools].forEach(tool => {
            this.seoData.tools.push({
                name: tool.name,
                type: tool.type || "tool",
                keywords: tool.keywords || this.generateToolKeywords(tool.name)
            });
        });

        // Generate comprehensive keywords from config and tools
        this.seoData.keywords = [
            ...this.seoData.popularTerms,
            ...this.seoData.platforms.map(p => p.keywords).flat(),
            ...this.seoData.tools.map(t => t.keywords).flat(),
            ...seoConfig.seoKeywords.primary,
            ...seoConfig.seoKeywords.tools,
            ...seoConfig.seoKeywords.membership,
            ...seoConfig.seoKeywords.automation
        ];

        // Remove duplicates
        this.seoData.keywords = [...new Set(this.seoData.keywords)];
    }

    generateToolKeywords(toolName) {
        const keywords = [];
        const name = toolName.toLowerCase();
        
        // Generate platform-specific keywords
        if (name.includes('netflix')) {
            keywords.push('netflix cookie checker', 'netflix account checker', 'free netflix cookies');
        }
        if (name.includes('chatgpt')) {
            keywords.push('chatgpt cookie checker', 'gpt cookie checker', 'free chatgpt cookies');
        }
        if (name.includes('claude')) {
            keywords.push('claude ai cookie checker', 'claude cookie checker', 'free claude ai cookies');
        }
        if (name.includes('spotify')) {
            keywords.push('spotify cookie checker', 'spotify premium checker', 'free spotify cookies');
        }
        if (name.includes('cursor')) {
            keywords.push('cursor cookie checker', 'cursor ai checker');
        }
        if (name.includes('crunchyroll')) {
            keywords.push('crunchyroll cookie checker', 'anime cookie checker');
        }
        if (name.includes('surfshark')) {
            keywords.push('surfshark cookie checker', 'vpn cookie checker');
        }
        if (name.includes('freepik')) {
            keywords.push('freepik cookie checker', 'design cookie checker');
        }
        if (name.includes('outlook')) {
            keywords.push('outlook cookie checker', 'outlook inbox searcher', 'hotmail checker');
        }
        if (name.includes('azure')) {
            keywords.push('azure cookie checker', 'cloud cookie checker');
        }
        
        return keywords;
    }

    generateSEO() {
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
            this.updateMetaTags();
            this.updateStructuredData();
            this.updateSitemap();
        });
    }

    updateMetaTags() {
        // Batch DOM updates for better performance
        const updates = [];
        
        // Update title
        const title = `${this.seoData.brand.shortName} - ${this.seoData.brand.tagline} | ${this.seoData.brand.name}`;
        document.title = title;

        // Update description
        const description = `${this.seoData.brand.shortName} - ${this.seoData.brand.name} | ${this.seoData.brand.tagline} for Free Netflix Cookies, Free ChatGPT Cookies, Free Claude AI Cookies. ${this.seoData.brand.description} with premium validation tools and Python source code available.`;
        
        // Batch all meta tag updates
        updates.push(
            () => this.updateMetaTag('description', description),
            () => this.updateMetaTag('keywords', this.seoData.keywords.join(', ')),
            () => this.updateMetaTag('og:title', title, 'property'),
            () => this.updateMetaTag('og:description', description, 'property'),
            () => this.updateMetaTag('og:url', window.location.href, 'property'),
            () => this.updateMetaTag('og:image', 'https://flamemodparadise.github.io/My-Site/assets/icons/fmp-icon.gif', 'property'),
            () => this.updateMetaTag('og:type', 'website', 'property'),
            () => this.updateMetaTag('og:site_name', this.seoData.brand.name, 'property'),
            () => this.updateMetaTag('twitter:card', 'summary_large_image'),
            () => this.updateMetaTag('twitter:title', title),
            () => this.updateMetaTag('twitter:description', description),
            () => this.updateMetaTag('twitter:image', 'https://flamemodparadise.github.io/My-Site/assets/icons/fmp-icon.gif')
        );

        // Execute all updates
        updates.forEach(update => update());
    }

    updateMetaTag(name, content, attribute = 'name') {
        let tag = document.querySelector(`meta[${attribute}="${name}"]`);
        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute(attribute, name);
            document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
    }

    updateStructuredData() {
        // Update Website schema
        const websiteSchema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": this.seoData.brand.name,
            "alternateName": [this.seoData.brand.shortName, "Best Discord Server", "Best Discord Cookie Server"],
            "url": window.location.origin + window.location.pathname,
            "description": `${this.seoData.brand.shortName} - ${this.seoData.brand.name} | ${this.seoData.brand.tagline} for Free Netflix Cookies, Free ChatGPT Cookies, Free Claude AI Cookies. ${this.seoData.brand.description} for 40+ platforms with Python source code.`,
            "keywords": this.seoData.keywords.slice(0, 20).join(', '),
            "about": this.seoData.platforms.slice(0, 10).map(platform => ({
                "@type": "Thing",
                "name": platform.name,
                "description": `${platform.name} - Professional ${platform.type}`
            }))
        };

        this.updateJSONLD('website-schema', websiteSchema);
    }

    updateJSONLD(id, schema) {
        let script = document.getElementById(id);
        if (!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.id = id;
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(schema, null, 2);
    }

    updateSitemap() {
        // This would update the sitemap dynamically
        // For now, we'll just log the platforms for sitemap generation
        console.log('Platforms for sitemap:', this.seoData.platforms.map(p => p.name));
    }

    // Method to get SEO data for external use
    getSEOData() {
        return {
            title: document.title,
            description: this.getMetaContent('description'),
            keywords: this.getMetaContent('keywords'),
            platforms: this.seoData.platforms,
            tools: this.seoData.tools
        };
    }

    getMetaContent(name) {
        const tag = document.querySelector(`meta[name="${name}"]`);
        return tag ? tag.getAttribute('content') : '';
    }

    // Method to add new keywords dynamically
    addKeywords(newKeywords) {
        this.seoData.keywords.push(...newKeywords);
        this.generateSEO();
    }

    // Method to update platform data
    updatePlatform(platformName, newData) {
        const index = this.seoData.platforms.findIndex(p => p.name === platformName);
        if (index !== -1) {
            this.seoData.platforms[index] = { ...this.seoData.platforms[index], ...newData };
            this.generateSEO();
        }
    }
}

// Initialize SEO Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.seoManager = new SEOManager();
    
    // Expose methods globally for easy access
    window.addSEOKeywords = (keywords) => window.seoManager.addKeywords(keywords);
    window.getSEOData = () => window.seoManager.getSEOData();
    window.updateSEOPlatform = (name, data) => window.seoManager.updatePlatform(name, data);
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SEOManager;
}
