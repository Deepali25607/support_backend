import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import productsRouter from './routes/products.js';
import leadsRouter from './routes/leads.js';
import demosRouter from './routes/demos.js';
import customRequestsRouter from './routes/customRequests.js';
import authRouter from './routes/auth.js';
import ticketsRouter from './routes/tickets.js';
import subscriptionsRouter from './routes/subscriptions.js';
import adminRouter from './routes/admin.js';
import blogRouter from './routes/blog.js';
import notificationsRouter from './routes/notifications.js';
import newsletterRouter from './routes/newsletter.js';
import caseStudiesRouter from './routes/caseStudies.js';
import couponsRouter from './routes/coupons.js';
import siteContentRouter from './routes/siteContent.js';
import docsRouter from './routes/docs.js';
import themeRouter from './routes/theme.js';
import { attachUser } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(attachUser);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'nexus-backend', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/demos', demosRouter);
app.use('/api/custom-requests', customRequestsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/blog', blogRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/case-studies', caseStudiesRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/site-content', siteContentRouter);
app.use('/api/docs', docsRouter);
app.use('/api/theme', themeRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

app.listen(PORT, () => {
  console.log(`NEXUS backend listening on http://localhost:${PORT}`);
});
