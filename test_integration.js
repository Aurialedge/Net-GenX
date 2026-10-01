// NetGenX Full Integration Test Suite
async function runTests() {
  console.log('====================================================');
  console.log('🛡️  NETGENX INTEGRATION TEST SUITE');
  console.log('====================================================');

  try {
    // Test 1: Frontend
    const res1 = await fetch('http://localhost:5173/');
    console.log('1. Frontend Server (5173):', res1.status, res1.ok ? 'OK' : 'FAIL');
  } catch (e) {
    console.log('1. Frontend Server (5173): Offline or booting -', e.message);
  }

  try {
    // Test 2: ML Health
    const res2 = await fetch('http://localhost:5000/health');
    const d2 = await res2.json();
    console.log('2. AI/ML Health (5000):', d2.status, '|', d2.service);
  } catch (e) {
    console.log('2. AI/ML Health (5000): Offline -', e.message);
  }

  let d3 = { final_risk_score: 94, final_prediction: 'Honeytrap_Attack' };
  try {
    // Test 3: ML Threat Prediction (Honeytrap)
    const res3 = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello handsome officer, saw you in uniform! Which regiment are you posted at in Leh? Can you share a picture of your bunker?' })
    });
    d3 = await res3.json();
    console.log('3. AI Threat Prediction:', d3.final_prediction, '| Score:', d3.final_risk_score, '| Severity:', d3.threat_level);
  } catch (e) {
    console.log('3. AI Threat Prediction: Failed -', e.message);
  }

  try {
    // Test 4: IPFS Core
    const res4 = await fetch('http://localhost:8000/');
    const d4 = await res4.json();
    console.log('4. IPFS Gateway (8000):', d4.service);
  } catch (e) {
    console.log('4. IPFS Gateway (8000): Offline -', e.message);
  }

  try {
    // Test 5: User Login
    const res5 = await fetch('http://localhost:8000/loginuser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer@army.mil', password: 'Password123' })
    });
    const d5 = await res5.json();
    console.log('5. Officer Auth (8000):', d5.status ? 'SUCCESS' : 'FAILED', '| Officer:', d5.name, '| Token received:', !!d5.token);
  } catch (e) {
    console.log('5. Officer Auth (8000): Failed -', e.message);
  }

  let d6 = { cid: 'QmTestDefaultCID123456789', url: 'http://localhost:8000/ipfs/QmTestDefaultCID123456789' };
  try {
    // Test 6: IPFS Text Upload
    const res6 = await fetch('http://localhost:8000/uploadtext', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'message=' + encodeURIComponent('EVIDENCE_RECORD: Suspicious honeytrap solicitation near forward post')
    });
    d6 = await res6.json();
    console.log('6. IPFS Upload & Multihash CID:', d6.cid, '| URL:', d6.url);
  } catch (e) {
    console.log('6. IPFS Upload: Failed -', e.message);
  }

  try {
    // Test 7: IPFS Gateway Retrieval
    const res7 = await fetch(d6.url);
    const text7 = await res7.text();
    console.log('7. IPFS Retrieval by CID:', text7.slice(0, 35) + '...');
  } catch (e) {
    console.log('7. IPFS Retrieval: Failed -', e.message);
  }

  try {
    // Test 8: Blockchain Insertion
    const note = `${d3.final_risk_score} ${d3.final_prediction.replace(/ /g, '_')} message`;
    const res8 = await fetch('http://localhost:9000/insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cid: d6.cid, note })
    });
    const d8 = await res8.json();
    console.log('8. Blockchain Ledger Store (9000):', d8.msg);
  } catch (e) {
    console.log('8. Blockchain Store: Failed -', e.message);
  }

  try {
    // Test 9: Blockchain Retrieval
    const res9 = await fetch('http://localhost:9000/getcids');
    const d9 = await res9.json();
    console.log('9. Blockchain CIDs Count:', d9.count, '| Top Incident Note:', d9.cids[0]?.note);
  } catch (e) {
    console.log('9. Blockchain Retrieval: Failed -', e.message);
  }

  let d10 = { official: { phone: '+91-9876543210' } };
  try {
    // Test 10: Official Login
    const res10 = await fetch('http://localhost:8000/loginofficial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officialId: 'ARMY-CERT-01', password: 'DefShield@2025' })
    });
    d10 = await res10.json();
    console.log('10. CERT-Army Official Auth:', d10.status ? 'VERIFIED' : 'FAILED', '| Dept:', d10.official?.department);
  } catch (e) {
    console.log('10. Official Auth: Failed -', e.message);
  }

  try {
    // Test 11: 2FA OTP
    const res11a = await fetch('http://localhost:8000/sendotp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: d10.official.phone })
    });
    const d11a = await res11a.json();
    console.log('11a. 2FA Dispatched:', d11a.msg, '| Code:', d11a.testOtp);

    const res11b = await fetch('http://localhost:8000/verifyotp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: d10.official.phone, code: d11a.testOtp || '123456' })
    });
    const d11b = await res11b.json();
    console.log('11b. 2FA Verification:', d11b.msg);
  } catch (e) {
    console.log('11. 2FA: Failed -', e.message);
  }

  try {
    // Test 12: AI Mitigation Guidance
    const res12 = await fetch('http://localhost:8000/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Honeytrap attempt on Army officer near border sector' })
    });
    const d12 = await res12.json();
    console.log('12. AI Guidance Steps Generated:', Object.keys(d12.data || {}).length, 'steps');
  } catch (e) {
    console.log('12. AI Guidance: Failed -', e.message);
  }

  console.log('====================================================');
  console.log('🎯 INTEGRATION TEST RUN COMPLETE');
  console.log('====================================================');
}

runTests();
