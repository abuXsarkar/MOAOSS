#!/usr/bin/env python3
"""Tests for the durable registry: a registered image survives transport and is recovered;
an unregistered image is correctly rejected (no false match)."""
import os
import tempfile
import unittest

import cv2

from lib import jpeg, rescale_roundtrip, synth
from registry import recover, register


class RegistryTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.reg = os.path.join(self.dir, "registry.json")
        self.paths = {}
        for seed in range(1, 6):
            p = os.path.join(self.dir, f"img{seed}.png")
            cv2.imwrite(p, synth(seed))
            self.paths[seed] = p
            register(p, f"manifest-{seed}", self.reg)

    def test_recovers_after_transport(self):
        # Strip + transport image #3: resize 70% round-trip + JPEG q40.
        img = jpeg(rescale_roundtrip(cv2.imread(self.paths[3]), 0.70), 40)
        out = os.path.join(self.dir, "transported.jpg")
        cv2.imwrite(out, img)
        res = recover(out, self.reg)
        self.assertEqual(res["match"], "manifest-3")
        self.assertTrue(res["confident"])
        self.assertLess(res["distance"], res["next_best_distance"])

    def test_rejects_unregistered(self):
        # A brand-new image not in the registry must not be confidently matched.
        out = os.path.join(self.dir, "stranger.png")
        cv2.imwrite(out, synth(999))
        res = recover(out, self.reg)
        self.assertIsNone(res["match"])
        self.assertFalse(res["confident"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
