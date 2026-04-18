const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const NodeCache = require('node-cache');

// Standard TTL of 1 hour (3600 seconds) since politician data 
// (elections/court cases) doesn't change by the minute.
const politicianCache = new NodeCache({ stdTTL: 3600 });

exports.getPoliticians = async (req, res) => {
    try {
        const cacheKey = 'all_politicians';
        const cachedData = politicianCache.get(cacheKey);

        if (cachedData) {
            console.log('Serving politicians from cache');
            return res.status(200).json({ success: true, data: cachedData, source: 'cache' });
        }

        console.log('Fetching politicians from database');
        const politicians = await prisma.politician.findMany({
            include: {
                courtCases: true,
                socialMentions: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Set in cache
        politicianCache.set(cacheKey, politicians);

        res.status(200).json({ success: true, data: politicians, source: 'database' });
    } catch (error) {
        console.error('Error fetching politicians:', error);
        res.status(500).json({ success: false, error: 'Internal server error while fetching politicians' });
    }
};

exports.getPoliticianById = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `politician_${id}`;
        const cachedData = politicianCache.get(cacheKey);

        if (cachedData) {
            return res.status(200).json({ success: true, data: cachedData, source: 'cache' });
        }

        const politician = await prisma.politician.findUnique({
            where: { id },
            include: {
                courtCases: true,
                socialMentions: true,
            }
        });

        if (!politician) {
            return res.status(404).json({ success: false, error: 'Politician not found' });
        }

        politicianCache.set(cacheKey, politician);

        res.status(200).json({ success: true, data: politician, source: 'database' });
    } catch (error) {
        console.error('Error fetching politician:', error);
        res.status(500).json({ success: false, error: 'Internal server error while fetching politician' });
    }
};
