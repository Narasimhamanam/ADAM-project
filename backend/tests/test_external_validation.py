from unittest.mock import Mock
import numpy as np
import pandas as pd
import pytest
from app.research.external_validation import harmonize_frozen_features, evaluate_frozen


def test_alignment_reorders_without_guessing_missing_taxa():
    df = pd.DataFrame({'Species_two': [2.], 'Species one': [1.]})
    x, _ = harmonize_frozen_features(df, ['Species_one', 'Species two'])
    assert x.tolist() == [[1., 2.]]
    with pytest.raises(ValueError, match='Missing'):
        harmonize_frozen_features(df, ['Species three'])
    with pytest.raises(ValueError, match='Ambiguous'):
        harmonize_frozen_features(pd.DataFrame({'A B': [1], 'A_B': [2]}), ['A B'])


def test_frozen_evaluation_never_refits():
    model = Mock()
    model.predict_proba.return_value = np.array([[.9, .1], [.2, .8]])
    result = evaluate_frozen(model, pd.DataFrame({'A': [1, 2]}), ['A'], [0, 1], ['s1', 's2'])
    model.fit.assert_not_called()
    assert result['subject_auc'] == 1
