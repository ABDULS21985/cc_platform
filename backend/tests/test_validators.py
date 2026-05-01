"""
Unit Tests for Marshmallow Validators (Verification Schemas)
Tests BVN and NIN validation logic
"""
import pytest
from marshmallow import ValidationError
from modules.verification.schemas.verification_schema import BVNSchema, NINSchema


class TestBVNValidator:
    """Test suite for BVN validation"""
    
    def test_valid_bvn(self):
        """Test validation passes with valid BVN"""
        schema = BVNSchema()
        data = schema.load({
            "bvn": "22222222221",
            "date_of_birth": "1990-01-15"
        })
        assert data["bvn"] == "22222222221"
        assert data["date_of_birth"] == "1990-01-15"
    
    def test_bvn_too_short(self):
        """Test validation fails when BVN is too short"""
        schema = BVNSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({
                "bvn": "2222222222",  # 10 digits
                "date_of_birth": "1990-01-15"
            })
        
        errors = exc_info.value.messages
        assert "bvn" in errors
    
    def test_bvn_too_long(self):
        """Test validation fails when BVN is too long"""
        schema = BVNSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({
                "bvn": "222222222212",  # 12 digits
                "date_of_birth": "1990-01-15"
            })
        
        errors = exc_info.value.messages
        assert "bvn" in errors
    
    def test_bvn_contains_letters(self):
        """Test validation fails when BVN contains letters"""
        schema = BVNSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({
                "bvn": "2222222222A",
                "date_of_birth": "1990-01-15"
            })
        
        errors = exc_info.value.messages
        assert "bvn" in errors
        assert any("only numbers" in str(e) for e in errors.get("bvn", []))
    
    def test_bvn_contains_spaces(self):
        """Test validation fails when BVN contains spaces"""
        schema = BVNSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({
                "bvn": "222 222 2221",
                "date_of_birth": "1990-01-15"
            })
        
        # Verify validation error occurs
        errors = exc_info.value.messages
        assert "bvn" in errors
    
    def test_invalid_date_format(self):
        """Test validation fails with wrong date format"""
        schema = BVNSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({
                "bvn": "22222222221",
                "date_of_birth": "01-15-1990"  # Wrong format
            })
        
        errors = exc_info.value.messages
        assert "date_of_birth" in errors
        assert any("YYYY-MM-DD format" in str(e) for e in errors.get("date_of_birth", []))
    
    def test_invalid_date(self):
        """Test validation fails with invalid date"""
        schema = BVNSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({
                "bvn": "22222222221",
                "date_of_birth": "1990-13-32"  # Invalid date
            })
        
        errors = exc_info.value.messages
        assert len(errors) > 0
    
    def test_underage_user(self):
        """Test validation fails for users under 18"""
        schema = BVNSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({
                "bvn": "22222222221",
                "date_of_birth": "2010-01-01"  # Under 18
            })
        
        errors = exc_info.value.messages
        assert "date_of_birth" in errors
        assert any("at least 18 years old" in str(e) for e in errors.get("date_of_birth", []))
    
    def test_unrealistic_age(self):
        """Test validation fails for unrealistic age"""
        schema = BVNSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({
                "bvn": "22222222221",
                "date_of_birth": "1800-01-01"  # 225 years old
            })
        
        errors = exc_info.value.messages
        assert "date_of_birth" in errors
        assert any("Invalid date of birth" in str(e) for e in errors.get("date_of_birth", []))
    
    def test_edge_case_18_years_old(self):
        """Test validation passes for exactly 18 years old"""
        from datetime import datetime, timedelta
        
        # Calculate date for someone who just turned 18
        exactly_18_years_ago = datetime.now() - timedelta(days=365*18 + 5)  # +5 for leap years
        dob = exactly_18_years_ago.strftime('%Y-%m-%d')
        
        schema = BVNSchema()
        data = schema.load({
            "bvn": "22222222221",
            "date_of_birth": dob
        })
        assert data["bvn"] == "22222222221"


class TestNINValidator:
    """Test suite for NIN validation"""
    
    def test_valid_nin(self):
        """Test validation passes with valid NIN"""
        schema = NINSchema()
        data = schema.load({
            "nin": "12345678901",
            "date_of_birth": "1990-01-15"
        })
        assert data["nin"] == "12345678901"
        assert data["date_of_birth"] == "1990-01-15"
    
    def test_nin_too_short(self):
        """Test validation fails when NIN is too short"""
        schema = NINSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({
                "nin": "1234567890",  # 10 digits
                "date_of_birth": "1990-01-15"
            })
        
        errors = exc_info.value.messages
        assert "nin" in errors
    
    def test_nin_contains_letters(self):
        """Test validation fails when NIN contains letters"""
        schema = NINSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({
                "nin": "1234567890A",
                "date_of_birth": "1990-01-15"
            })
        
        errors = exc_info.value.messages
        assert "nin" in errors
        assert any("only numbers" in str(e) for e in errors.get("nin", []))
    
    def test_nin_date_validation(self):
        """Test NIN validates date of birth correctly"""
        schema = NINSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({
                "nin": "12345678901",
                "date_of_birth": "2015-01-01"  # Too young
            })
        
        errors = exc_info.value.messages
        assert "date_of_birth" in errors
        assert any("at least 18 years old" in str(e) for e in errors.get("date_of_birth", []))


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
