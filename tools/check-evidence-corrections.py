"""Regression tests for explicit evidence corrections, without rendering or network."""
import copy
import unittest
from build import apply_verified_corrections

class Corrections(unittest.TestCase):
    def setUp(self):
        self.atlas = {'locations':[{'id':'field','kind':'candidate','source_ids':['T1']}],
                      'sources':[{'id':'T1','source_type':'T'}]}
        self.patch = {'id':'field','expected':{'kind':'candidate'},
                      'replace':{'kind':'agriculture'},'source_ids':['T1']}
    def apply(self):
        apply_verified_corrections(self.atlas,[{'verifiedLocationCorrections':[self.patch]}])
    def rejects(self):
        original=copy.deepcopy(self.atlas)
        with self.assertRaises(ValueError): self.apply()
        self.assertEqual(self.atlas,original)
    def test_verified_patch(self):
        self.apply();self.assertEqual(self.atlas['locations'][0]['kind'],'agriculture')
    def test_empty_module_preserves_original(self):
        before=copy.deepcopy(self.atlas);apply_verified_corrections(self.atlas,[{}]);self.assertEqual(before,self.atlas)
    def test_stale_research(self):
        self.atlas['locations'][0]['kind']='new research';self.rejects()
    def test_unknown_location(self):
        self.patch['id']='other';self.rejects()
    def test_rejects_coordinates(self):
        self.patch['expected']['position']=None;self.patch['replace']['position']=[1,2,3];self.rejects()
    def test_missing_expected_field(self):
        self.patch['replace']['verified_fact']='new fact';self.rejects()
    def test_missing_reference(self):
        self.patch['source_ids']=[];self.rejects()
    def test_community_summary_is_not_transcript(self):
        self.atlas['sources'][0]['source_type']='C';self.rejects()
    def test_unattached_source(self):
        self.atlas['locations'][0]['source_ids']=[];self.rejects()
    def test_unknown_source(self):
        self.atlas['sources']=[];self.rejects()
    def test_duplicate_patch_fails_compare_and_set(self):
        self.apply()
        with self.assertRaises(ValueError):self.apply()

if __name__=='__main__': unittest.main(verbosity=2)
