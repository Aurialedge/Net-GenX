import express from 'express';
import cors from 'cors';
import insert from './scripts/interact.js';
import retrieve from './scripts/retrieve_all_cids.js';
const app = express();
app.use(cors({
  origin:"http://localhost:5173",
  credentials:true
}));
app.use(express.json()); // <-- required to parse JSON body

app.get('/', (req, res) => {
  res.json({ msg: 'Blockchain API' });
});

app.post('/insert', async (req, res) => {
    const { cid, note } = req.body;
    console.log(cid,note)
    if (!cid) return res.status(400).json({ msg: 'CID is required' });
  
    try {
      await insert(cid, note || "");
      res.json({ msg: 'CID inserted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Error inserting CID', error: err.message });
    }
  });
  
  app.get('/getcids', async (req, res) => {
    try {
      const cids = await retrieve();
      res.status(200).json({ msg: 'CIDs retrieved successfully', cids });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Error retrieving CIDs', error: err.message });
    }
  });
  app.post('/logout',async (req,res)=>{
    res.clearCookie('logintoken')
    console.log('in logout in block')
    res.status(200).json({msg:'Logged out successfully'})
  })
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));