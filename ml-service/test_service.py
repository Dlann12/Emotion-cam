import unittest
from fastapi.testclient import TestClient
from app.main import app

class TestMLService(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertTrue(data.get("cuda_available"))
        self.assertEqual(data.get("device"), "cuda")
        self.assertIn("GTX 1650", data.get("gpu_name", ""))

    def test_predict_base64_empty_or_invalid(self):
        response = self.client.post("/predict-base64", json={"image": "invalid_data"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data.get("success"))

if __name__ == "__main__":
    unittest.main()
