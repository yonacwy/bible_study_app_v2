use std::{num::NonZeroU32, thread::{spawn, JoinHandle}, time::SystemTime};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::{bible::{Bible, ChapterIndex, VerseRange}, readings::{ReadingsDatabase, SelectedReading}, searching, utils::Shared};

const BIBLE_READER_EVENT_NAME: &str = "bible-reader-event";

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq)]
#[serde(rename_all = "snake_case", tag = "type", content = "data")]
pub enum BibleReaderEvent
{
    BehaviorChanged
    {
        behavior: ReaderBehavior
    },
    TimerStarted,
    TimerTick
    {
        elapsed: f32,
        duration: f32,
    },
    TimerFinished,
}

pub struct ReaderTimerThread
{
    thread: JoinHandle<()>,
    state: Shared<ReaderTimerState>,
    current_time: Shared<f32>,
    duration: f32
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum ReaderTimerState
{
    Playing,
    Paused,
    Stopped
}

impl ReaderTimerThread
{
    pub fn new(app_handle: AppHandle, time: f32) -> Self 
    {
        let current_time = Shared::new(0.0);
        let current_time_inner = current_time.clone();

        let state = Shared::new(ReaderTimerState::Playing);
        let state_inner = state.clone();
        
        app_handle.emit(BIBLE_READER_EVENT_NAME, BibleReaderEvent::TimerStarted).unwrap();

        let thread = spawn(move || {
            let mut current = SystemTime::now();
            let mut last_tick = *current_time_inner.get();

            const TICK_TIME: f32 = 0.5;

            while *state_inner.get() != ReaderTimerState::Stopped
            {
                if *state_inner.get() == ReaderTimerState::Paused { continue; }
                let mut current_time_binding = current_time_inner.get();

                if last_tick > *current_time_binding { last_tick = *current_time_binding }

                *current_time_binding += current.elapsed().unwrap().as_secs_f32();
                current = SystemTime::now();

                if *current_time_binding - last_tick > TICK_TIME
                {
                    last_tick = *current_time_binding;
                    app_handle.emit(BIBLE_READER_EVENT_NAME, BibleReaderEvent::TimerTick { 
                        elapsed: *current_time_binding, 
                        duration: time 
                    }).unwrap();
                }
            }
        
            app_handle.emit(BIBLE_READER_EVENT_NAME, BibleReaderEvent::TimerFinished).unwrap();
        });

        Self {
            thread,
            state,
            current_time,
            duration: time,
        }
    }

    pub fn stop(self)
    {
        *self.state.get() = ReaderTimerState::Stopped;
        self.thread.join().unwrap();
    }

    pub fn play(&mut self)
    {
        *self.state.get() = ReaderTimerState::Playing;
    }

    pub fn pause(&mut self)
    {
        *self.state.get() = ReaderTimerState::Paused;
    }

    pub fn reset(&mut self)
    {
        *self.current_time.get() = 0.0;
    }

    pub fn current_time(&self) -> f32
    {
        *self.current_time.get()
    }

    pub fn duration(&self) -> f32 
    {
        self.duration
    }
}

#[derive(Serialize, Deserialize)]
pub struct BibleReaderSection
{
    pub chapter: ChapterIndex,
    pub verses: Option<VerseRange>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ReaderBehavior
{
    Segment
    {
        start: ChapterIndex,
        length: Option<NonZeroU32>, // if None, we just keep going
        options: RepeatOptions,
    },
    Daily
    {
        month: u32,
        day: u32,
        options: RepeatOptions
    }
}

impl ReaderBehavior
{
    pub fn get_duration(&self) -> Option<f32>
    {
        match self 
        {
            ReaderBehavior::Segment { start: _, length: _, options } => match options {
                RepeatOptions::RepeatTime(d) => Some(*d),
                _ => None
            },
            ReaderBehavior::Daily { month: _, day: _, options } => match options {
                RepeatOptions::RepeatTime(d) => Some(*d),
                _ => None
            },
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq)]
#[serde(rename_all = "snake_case", tag = "type", content = "data")]
pub enum RepeatOptions
{
    NoRepeat,
    RepeatCount(u32),
    RepeatTime(f32),
    Infinite,
}

impl RepeatOptions
{
    // HACK
    pub fn get_count(&self) -> u32
    {
        match self
        {
            RepeatOptions::NoRepeat => 1,
            RepeatOptions::RepeatCount(c) => *c,
            RepeatOptions::RepeatTime(_) => u32::MAX,
            RepeatOptions::Infinite => u32::MAX,
        }
    }
}

impl Default for RepeatOptions
{
    fn default() -> Self 
    {
        Self::NoRepeat
    }
}

pub struct ReaderState
{
    behavior: ReaderBehavior,
    app_handle: AppHandle,
    timer: Option<ReaderTimerThread>,
    reading_index: u32,
}

impl ReaderState
{
    pub fn new(app_handle: AppHandle, chapter: ChapterIndex) -> Self 
    {
        Self 
        {
            behavior: ReaderBehavior::Segment { 
                start: chapter, 
                length: Some(NonZeroU32::new(1).unwrap()),
                options: RepeatOptions::NoRepeat, 
            },
            app_handle,
            timer: None,
            reading_index: 0,
        }
    }

    pub fn set_behavior(&mut self, behavior: ReaderBehavior)
    {
        self.behavior = behavior;
        self.app_handle.emit(BIBLE_READER_EVENT_NAME, BibleReaderEvent::BehaviorChanged { behavior }).unwrap();
        self.stop_timer();

        self.reading_index = 0;
    }

    pub fn get_behavior(&self) -> &ReaderBehavior
    {
        &self.behavior
    }

    pub fn reset_index(&mut self)
    {
        self.reading_index = 0;
    }

    pub fn start_timer(&mut self)
    {
        self.stop_timer();
        if let Some(duration) = self.behavior.get_duration()
        {
            self.timer = Some(ReaderTimerThread::new(self.app_handle.clone(), duration));
        }
    }

    pub fn pause_timer(&mut self)
    {
        if let Some(timer) = &mut self.timer
        {
            timer.pause();
        }
    }

    pub fn resume_timer(&mut self)
    {
        if let Some(timer) = &mut self.timer
        {
            timer.play();
        }
    }

    pub fn stop_timer(&mut self)
    {
        if let Some(timer) = self.timer.take()
        {
            timer.stop();
        }
    }

    pub fn get_next(&mut self, bible: &Bible, readings_database: &ReadingsDatabase, selected_reading: SelectedReading) -> Option<BibleReaderSection>
    {
        let section = match self.behavior {
            ReaderBehavior::Segment { start, length, options } => {
                let length = match length {
                    Some(l) => l.get(),
                    None => u32::MAX // also HACK....
                };

                if self.reading_index / length as u32 >= options.get_count()
                {
                    return None;
                }

                let count = self.reading_index / length;
                let view = bible.get_view();
                let chapter = match view.increment_chapter(start, count) 
                {
                    Some(chapter) => chapter,
                    None => return None,
                };

                BibleReaderSection {
                    chapter,
                    verses: None,
                }
            },
            ReaderBehavior::Daily { month, day, options } => {
                let readings = readings_database.get_readings(month, day, selected_reading);
                
                if self.reading_index / readings.len() as u32 >= options.get_count()
                {
                    return None;
                }

                let reading = &readings[self.reading_index as usize % readings.len()];

                let book = searching::get_book_from_name(reading.prefix, &reading.book, bible).unwrap().index;
                let number = reading.chapter;
                let chapter = ChapterIndex {
                    book,
                    number,
                };

                BibleReaderSection {
                    chapter,
                    verses: reading.range
                }
            },
        };
        self.reading_index += 1;

        Some(section)
    }
}