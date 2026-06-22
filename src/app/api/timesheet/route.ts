import { NextResponse } from 'next/server';
import { submitTimesheet } from '@/lib/clockify';

interface TimesheetFormData {
  startDate: string;
  endDate: string;
  projectName: string;
  description: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  try {
    const body: TimesheetFormData = await request.json();

    if (!body.startDate || !body.endDate || !body.projectName || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!DATE_REGEX.test(body.startDate) || !DATE_REGEX.test(body.endDate)) {
      return NextResponse.json(
        { error: 'Dates must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    if (body.startDate > body.endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    const apiKey = process.env.CLOCKIFY_API_KEY;
    if (!apiKey) {
      console.error('CLOCKIFY_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Clockify API key not configured' },
        { status: 500 }
      );
    }

    const result = await submitTimesheet({
      apiKey,
      startDate: body.startDate,
      endDate: body.endDate,
      projectName: body.projectName,
      description: body.description,
    });

    console.log(result.log.join('\n'));

    return NextResponse.json(
      {
        success: true,
        message: 'Timesheet submitted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Timesheet form error:', error);

    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    );
  }
}
