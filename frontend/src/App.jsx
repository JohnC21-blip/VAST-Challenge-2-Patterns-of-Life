import React from 'react'
import Question1 from './questions/q1/Question1'
import Question2 from './questions/q2/Question2'
import Question3 from './questions/q3/Question3'
import Question4 from './questions/q4/Question4'
import './styles/dashboard.css'
import './styles/navbar.css'

const questions = [
    {id: 'q1', label: 'Question 1', component: Question1},
    {id: 'q2', label: 'Question 2', component: Question2},
    {id: 'q3', label: 'Question 3', component: Question3},
    {id: 'q4', label: 'Question 4', component: Question4}
]

export default function App() {
    const [activeQuestion, setActiveQuestion] = React.useState('q1');
    const [slideDirection, setSlideDirection] = React.useState('next');
    const [previousQuestion, setPreviousQuestion] = React.useState(null);
    const ActiveQuestion = questions.find((question) => question.id === activeQuestion).component;
    const PreviousQuestion = previousQuestion ? questions.find((question) => question.id === previousQuestion).component : null;
    const activeIndex = questions.findIndex((question) => question.id === activeQuestion);

    React.useEffect(() => {
        document.body.classList.toggle('isQ4Active', activeQuestion === 'q4');

        return () => {
            document.body.classList.remove('isQ4Active');
        };
    }, [activeQuestion]);

    React.useEffect(() => {
        if (!previousQuestion) {
            return undefined;
        }

        const transitionCleanup = window.setTimeout(() => {
            setPreviousQuestion(null);
        }, 380);

        return () => {
            window.clearTimeout(transitionCleanup);
        };
    }, [previousQuestion, activeQuestion]);

    function selectQuestion(nextQuestionId) {
        if (nextQuestionId === activeQuestion) {
            return;
        }

        const nextIndex = questions.findIndex((question) => question.id === nextQuestionId);
        setSlideDirection(nextIndex > activeIndex ? 'next' : 'previous');
        setPreviousQuestion(activeQuestion);
        setActiveQuestion(nextQuestionId);
    }

    return (
        <div className={activeQuestion === 'q4' ? 'shell shellQ4' : 'shell'}>
            <header className='navbar'>
                <div className='brand'>
                    <span>Challenge 2: Patterns of Life</span>
                </div>
                <nav className='nav' aria-label='Analysis sections'
                     style={{
                         '--active-index': questions.findIndex((q) => q.id === activeQuestion),
                         '--item-count': questions.length
                     }}
                >

                    <span className='indicator' aria-hidden='true'/>

                    {questions.map((question) => (
                        <button
                            key={question.id}
                            type='button'
                            className={activeQuestion === question.id ? 'isActive' : ''}
                            onClick={() => selectQuestion(question.id)}
                        >
                            {question.label}
                        </button>
                    ))}

                </nav>
            </header>

            <div className={`pageTransitionViewport slide-${slideDirection}`}>
                {PreviousQuestion ? (
                    <div
                        key={`previous-${previousQuestion}`}
                        className="pageLayer pageLayerExit"
                        aria-hidden="true"
                    >
                        <PreviousQuestion/>
                    </div>
                ) : null}

                <div
                    key={activeQuestion}
                    className={PreviousQuestion ? 'pageLayer pageLayerEnter' : 'pageLayer pageLayerCurrent'}
                >
                    <ActiveQuestion/>
                </div>
            </div>
        </div>
    )
}
